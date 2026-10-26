import uuid
import logging
from urllib.parse import urlparse
from typing import Dict, Any, Optional

from ..config import settings
from .crawler import WebsiteCrawler, is_safe_url
from ..preprocessing.chunker import create_page_chunks
from ..embeddings.embedder import get_embedder
from ..vector_store.store import get_vector_store
from ..database import db

logger = logging.getLogger(__name__)

def run_indexing_pipeline(
    root_url: str,
    max_pages: int = 20,
    max_depth: int = 2,
    same_domain_only: bool = True,
    chunk_size: int = 600,
    chunk_overlap: int = 120,
    job_id: Optional[str] = None
) -> str:
    """
    Executes the complete crawl -> preprocess -> chunk -> embed -> index pipeline.
    Updates DB and vector store incrementally.
    """
    if not job_id:
        job_id = str(uuid.uuid4())

    safe, reason = is_safe_url(root_url)
    if not safe:
        db.create_crawl_job(job_id, None, root_url)
        db.update_crawl_job(job_id, status="failed", error_message=reason)
        raise ValueError(reason)

    parsed = urlparse(root_url)
    domain = parsed.netloc.lower()

    # 1. Upsert website entry in DB
    website_id = db.upsert_website(root_url=root_url, domain=domain, title=domain)
    db.create_crawl_job(job_id, website_id, root_url)

    embedder = get_embedder()
    vector_store = get_vector_store()

    def on_progress(p: Dict[str, Any]):
        db.update_crawl_job(
            job_id,
            current_stage=p.get("stage", "Crawling"),
            current_url=p.get("current_url"),
            crawled_count=p.get("crawled_count", 0),
            failed_count=p.get("failed_count", 0),
            total_discovered=p.get("total_discovered", 1)
        )

    try:
        # 2. Crawl
        db.update_crawl_job(job_id, current_stage="Crawling pages")
        crawler = WebsiteCrawler(
            root_url=root_url,
            max_pages=max_pages,
            max_depth=max_depth,
            same_domain_only=same_domain_only,
            job_id=job_id
        )
        crawled_pages = crawler.crawl(progress_callback=on_progress)

        # Check for cancellation
        current_job = db.get_crawl_job(job_id)
        if current_job and current_job.get("status") == "cancelled":
            return job_id

        # 3. Preprocess, Chunk, Embed & Store
        db.update_crawl_job(job_id, current_stage="Preprocessing and generating vector embeddings")
        
        all_new_chunks = []
        texts_to_embed = []
        website_title = domain

        for page in crawled_pages:
            url = page["url"]
            title = page["title"]
            if title and website_title == domain:
                website_title = title

            status = page["status"]
            text_content = page.get("text_content", "")
            word_count = page.get("word_count", 0)
            err = page.get("error_message", "")
            status_code = page.get("status_code")
            depth = page.get("depth", 0)

            # Insert page record
            page_id = db.insert_page(
                website_id=website_id,
                url=url,
                title=title,
                status=status,
                status_code=status_code,
                depth=depth,
                word_count=word_count,
                chunk_count=0,
                text_content=text_content,
                error_message=err
            )

            if status == "success" and text_content.strip():
                # Generate chunks
                page_chunks = create_page_chunks(
                    page_id=page_id,
                    website_id=website_id,
                    url=url,
                    title=title,
                    text=text_content,
                    chunk_size=chunk_size,
                    chunk_overlap=chunk_overlap
                )

                for chunk in page_chunks:
                    # Save chunk in DB
                    cid = db.insert_chunk(
                        website_id=website_id,
                        page_id=page_id,
                        chunk_index=chunk["chunk_index"],
                        text=chunk["raw_text"],
                        token_count=chunk["token_count"],
                        url=url,
                        title=title
                    )
                    chunk_meta = {
                        "chunk_id": cid,
                        "chunk_index": chunk["chunk_index"],
                        "website_id": website_id,
                        "page_id": page_id,
                        "url": url,
                        "title": title,
                        "raw_text": chunk["raw_text"]
                    }
                    all_new_chunks.append(chunk_meta)
                    texts_to_embed.append(chunk["enriched_text"])

                # Update page chunk count
                conn = db.get_connection()
                conn.execute("UPDATE pages SET chunk_count = ? WHERE id = ?", (len(page_chunks), page_id))
                conn.commit()
                conn.close()

        # Update website title if extracted
        if website_title != domain:
            conn = db.get_connection()
            conn.execute("UPDATE websites SET title = ? WHERE id = ?", (website_title, website_id))
            conn.commit()
            conn.close()

        # 4. Generate Embeddings & Update Vector Store
        if texts_to_embed:
            logger.info(f"Generating embeddings for {len(texts_to_embed)} chunks...")
            embeddings = embedder.embed_documents(texts_to_embed)
            vector_store.add_documents(all_new_chunks, embeddings)

        # 5. Finalize website statistics
        db.update_website_stats(website_id)

        # Mark job completed
        db.update_crawl_job(
            job_id,
            status="completed",
            current_stage="Indexing complete",
            completed_at=db.datetime.utcnow().isoformat()
        )
        logger.info(f"Indexing pipeline completed successfully for job {job_id}")

    except Exception as e:
        logger.exception(f"Pipeline error for job {job_id}: {e}")
        db.update_crawl_job(
            job_id,
            status="failed",
            error_message=str(e),
            current_stage="Failed"
        )

    return job_id

import ipaddress
import socket
import time
import logging
from collections import deque
from urllib.parse import urlparse, urlunparse
from urllib.robotparser import RobotFileParser
from typing import List, Dict, Any, Optional, Set, Callable, Tuple
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from ..config import settings
from .extractor import extract_content_and_links
from ..database import db

logger = logging.getLogger(__name__)

# SSRF Protection: Denied IP ranges
BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),         # Current network
    ipaddress.ip_network("10.0.0.0/8"),        # Private network
    ipaddress.ip_network("127.0.0.0/8"),       # Loopback
    ipaddress.ip_network("169.254.0.0/16"),    # Link-local / AWS / GCP metadata
    ipaddress.ip_network("172.16.0.0/12"),     # Private network
    ipaddress.ip_network("192.168.0.0/16"),    # Private network
    ipaddress.ip_network("100.64.0.0/10"),     # Carrier-grade NAT
    ipaddress.ip_network("198.18.0.0/15"),     # Benchmarking
    ipaddress.ip_network("::1/128"),           # IPv6 Loopback
    ipaddress.ip_network("fc00::/7"),          # IPv6 Unique Local
    ipaddress.ip_network("fe80::/10"),         # IPv6 Link-local
]

BLOCKED_HOSTNAMES = {
    "localhost", "metadata.google.internal", "instance-data", "169.254.169.254"
}

def is_safe_url(url: str) -> Tuple[bool, str]:
    """
    Validates URL to prevent SSRF attacks.
    Ensures scheme is http/https and resolved IP does not point to internal/loopback/cloud metadata.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme.lower() not in ("http", "https"):
            return False, f"Invalid scheme: {parsed.scheme}. Only HTTP and HTTPS are permitted."

        hostname = parsed.hostname
        if not hostname:
            return False, "Missing hostname in URL."

        hostname_lower = hostname.lower()
        if hostname_lower in BLOCKED_HOSTNAMES:
            return False, f"Access to host '{hostname}' is blocked for security."

        # Check if hostname is already a raw IP string
        try:
            ip = ipaddress.ip_address(hostname)
            for net in BLOCKED_NETWORKS:
                if ip in net:
                    return False, f"Access to private/internal IP {ip} is blocked."
            return True, ""
        except ValueError:
            # Not an IP literal, resolve DNS
            pass

        # Resolve hostname via DNS
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for item in addr_info:
                ip_str = item[4][0]
                ip = ipaddress.ip_address(ip_str)
                for net in BLOCKED_NETWORKS:
                    if ip in net:
                        return False, f"Resolved IP {ip_str} for host '{hostname}' is in a private/restricted network."
        except socket.gaierror as e:
            return False, f"DNS resolution failed for {hostname}: {str(e)}"

        return True, ""
    except Exception as e:
        return False, f"Security validation error: {str(e)}"


class WebsiteCrawler:
    def __init__(self, root_url: str, max_pages: int = 20, max_depth: int = 2,
                 same_domain_only: bool = True, job_id: Optional[str] = None):
        self.root_url = self._normalize_url(root_url)
        self.max_pages = max_pages
        self.max_depth = max_depth
        self.same_domain_only = same_domain_only
        self.job_id = job_id
        
        parsed = urlparse(self.root_url)
        self.root_domain = parsed.netloc.lower()
        self.scheme = parsed.scheme.lower()
        
        # Setup requests session with retries and timeout
        self.session = requests.Session()
        retries = Retry(total=2, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504])
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebsiteIntelligenceAssistant/1.0"
        })

        self.robot_parser: Optional[RobotFileParser] = None
        self._init_robots_txt()

    def _normalize_url(self, url: str) -> str:
        parsed = urlparse(url)
        scheme = parsed.scheme.lower() or "https"
        netloc = parsed.netloc.lower()
        path = parsed.path
        if not path:
            path = "/"
        # Strip trailing slash if not root
        if len(path) > 1 and path.endswith("/"):
            path = path[:-1]
        return urlunparse((scheme, netloc, path, parsed.params, parsed.query, ""))

    def _init_robots_txt(self):
        if not settings.respect_robots_txt:
            return
        robots_url = f"{self.scheme}://{self.root_domain}/robots.txt"
        safe, _ = is_safe_url(robots_url)
        if not safe:
            return
        
        try:
            self.robot_parser = RobotFileParser()
            self.robot_parser.set_url(robots_url)
            self.robot_parser.read()
        except Exception as e:
            logger.warning(f"Could not read robots.txt from {robots_url}: {e}")
            self.robot_parser = None

    def is_allowed_by_robots(self, url: str) -> bool:
        if not self.robot_parser or not settings.respect_robots_txt:
            return True
        try:
            return self.robot_parser.can_fetch("*", url) or self.robot_parser.can_fetch("WebsiteIntelligenceAssistant", url)
        except Exception:
            return True

    def fetch_page(self, url: str) -> Tuple[Optional[str], Optional[int], Optional[str]]:
        """
        Safely fetches page HTML, validating against SSRF even through redirects.
        Returns (html_content, status_code, error_message)
        """
        safe, reason = is_safe_url(url)
        if not safe:
            return None, 403, reason

        if not self.is_allowed_by_robots(url):
            return None, 403, "Blocked by website robots.txt rules"

        try:
            # We fetch with stream=True to prevent massive downloads (DoS prevention)
            resp = self.session.get(
                url,
                timeout=settings.request_timeout,
                stream=True,
                allow_redirects=True
            )
            
            # Check redirect target for SSRF
            if resp.history:
                final_safe, final_reason = is_safe_url(resp.url)
                if not final_safe:
                    return None, 403, f"Redirect to unsafe address: {final_reason}"

            status_code = resp.status_code
            content_type = resp.headers.get("Content-Type", "").lower()
            
            # Allow text/html or application/xhtml+xml
            if "text/html" not in content_type and "application/xhtml" not in content_type:
                return None, status_code, f"Skipped non-HTML content type: {content_type}"

            # Limit download size
            content = []
            size = 0
            for chunk in resp.iter_content(chunk_size=8192):
                content.append(chunk)
                size += len(chunk)
                if size > settings.max_page_size_bytes:
                    return None, 413, "Page exceeds maximum allowed size (2MB)"

            html = b"".join(content).decode(resp.encoding or "utf-8", errors="replace")
            return html, status_code, None
        except requests.exceptions.Timeout:
            return None, 408, "Request timed out"
        except requests.exceptions.ConnectionError as ce:
            return None, 503, f"Connection failed: {str(ce)}"
        except Exception as e:
            return None, 500, f"Fetch error: {str(e)}"

    def crawl(self, progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None) -> List[Dict[str, Any]]:
        """
        Executes breadth-first crawl within domain and depth boundaries.
        Returns list of page data dictionaries.
        """
        visited: Set[str] = set()
        queue: deque = deque([(self.root_url, 0)]) # (url, depth)
        crawled_results: List[Dict[str, Any]] = []

        total_discovered = 1
        crawled_count = 0
        failed_count = 0

        while queue and crawled_count < self.max_pages:
            # Check if job was cancelled
            if self.job_id:
                job = db.get_crawl_job(self.job_id)
                if job and job.get("status") == "cancelled":
                    logger.info(f"Crawl job {self.job_id} cancelled by user.")
                    break

            url, depth = queue.popleft()
            normalized = self._normalize_url(url)
            if normalized in visited:
                continue
            visited.add(normalized)

            # Domain check
            parsed = urlparse(normalized)
            if self.same_domain_only and parsed.netloc.lower() != self.root_domain:
                continue

            if progress_callback:
                progress_callback({
                    "stage": "Crawling page",
                    "current_url": normalized,
                    "crawled_count": crawled_count,
                    "failed_count": failed_count,
                    "total_discovered": total_discovered,
                    "depth": depth
                })

            html, status_code, err = self.fetch_page(normalized)
            time.sleep(settings.politeness_delay)

            if err or not html:
                failed_count += 1
                crawled_results.append({
                    "url": normalized,
                    "title": "",
                    "status": "failed",
                    "status_code": status_code or 500,
                    "depth": depth,
                    "word_count": 0,
                    "text_content": "",
                    "error_message": err or "Empty response"
                })
                continue

            # Content extraction
            title, text_content, discovered_links = extract_content_and_links(html, normalized)
            word_count = len(text_content.split())
            
            crawled_count += 1
            crawled_results.append({
                "url": normalized,
                "title": title or normalized,
                "status": "success",
                "status_code": status_code,
                "depth": depth,
                "word_count": word_count,
                "text_content": text_content,
                "error_message": ""
            })

            # Queue child links if depth allows
            if depth < self.max_depth:
                for link in discovered_links:
                    norm_link = self._normalize_url(link)
                    if norm_link not in visited:
                        # Ensure domain match
                        link_netloc = urlparse(norm_link).netloc.lower()
                        if not self.same_domain_only or link_netloc == self.root_domain:
                            queue.append((norm_link, depth + 1))
                            total_discovered += 1

            if progress_callback:
                progress_callback({
                    "stage": "Crawled page successfully",
                    "current_url": normalized,
                    "crawled_count": crawled_count,
                    "failed_count": failed_count,
                    "total_discovered": total_discovered,
                    "depth": depth
                })

        return crawled_results

import pytest
from backend.app.crawler.crawler import is_safe_url
from backend.app.crawler.extractor import extract_content_and_links

def test_ssrf_blocks_localhost():
    safe, reason = is_safe_url("http://localhost:8000")
    assert not safe
    assert "blocked" in reason.lower() or "localhost" in reason.lower()

def test_ssrf_blocks_loopback_ip():
    safe, reason = is_safe_url("http://127.0.0.1:5000/secret")
    assert not safe

def test_ssrf_blocks_private_subnets():
    safe1, _ = is_safe_url("http://192.168.1.1/admin")
    assert not safe1
    safe2, _ = is_safe_url("http://10.0.0.1/")
    assert not safe2
    safe3, _ = is_safe_url("http://172.16.0.5/")
    assert not safe3

def test_ssrf_blocks_cloud_metadata():
    safe, _ = is_safe_url("http://169.254.169.254/latest/meta-data/")
    assert not safe

def test_ssrf_allows_public_urls():
    safe, reason = is_safe_url("https://www.google.com")
    assert safe
    assert reason == ""

def test_html_extraction_and_boilerplate_removal():
    html = """
    <html>
      <head><title>Test Documentation</title></head>
      <body>
        <nav><a href="/home">Home</a><a href="/about">About</a></nav>
        <header>Header content to strip</header>
        <main>
          <h1>Introduction to Web Data Mining</h1>
          <p>Web data mining is the application of data mining techniques to discover patterns from the Web.</p>
          <a href="/chapter2">Chapter 2</a>
          <a href="https://external.com/page">External Link</a>
        </main>
        <footer>Copyright 2026</footer>
        <script>console.log("malicious code");</script>
      </body>
    </html>
    """
    title, text, links = extract_content_and_links(html, "https://example.com/chapter1")
    assert title == "Test Documentation"
    assert "Web data mining is the application" in text
    assert "console.log" not in text
    assert "Copyright 2026" not in text
    assert "Header content to strip" not in text
    assert "https://example.com/chapter2" in links

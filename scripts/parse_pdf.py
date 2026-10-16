#!/usr/bin/env python3
"""
High-Speed pypdf Extraction Engine for Insurance Policy Documents.
Extracts complete multi-page text with zero OCR error rate from digital PDFs.
"""

import sys
import json
import os

try:
    import pypdf
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "pypdf is not installed in python environment"
    }))
    sys.exit(0)


def extract_with_pypdf(pdf_path: str):
    if not os.path.exists(pdf_path):
        return {
            "success": False,
            "error": f"File not found: {pdf_path}"
        }

    try:
        reader = pypdf.PdfReader(pdf_path)
        total_pages = len(reader.pages)
        pages_text = []
        total_chars = 0

        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            clean_text = page_text.strip()
            if clean_text:
                total_chars += len(clean_text)
                pages_text.append(f"### [Page {i + 1} of {total_pages}]\n{clean_text}")

        # A PDF is digital if it contains text (>30 chars total and reasonable density)
        is_digital = total_chars > 30 and (total_chars / max(1, total_pages)) >= 8
        full_text = "\n\n---\n\n".join(pages_text) if is_digital else ""
        word_count = len(full_text.split()) if full_text else 0

        return {
            "success": True,
            "isDigital": is_digital,
            "pageCount": total_pages,
            "charCount": total_chars,
            "wordCount": word_count,
            "text": full_text
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Missing pdf file path argument"
        }))
        sys.exit(1)

    file_path = sys.argv[1]
    result = extract_with_pypdf(file_path)
    print(json.dumps(result))

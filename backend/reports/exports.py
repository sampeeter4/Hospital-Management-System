import csv
from django.http import HttpResponse


def sanitize_csv_cell(value):
    """
    Prevents CSV / Spreadsheet Formula Injection (CWE-1236).
    If a cell value starts with '=', '+', '-', '@', tab, or carriage return,
    prepends a single quote to force spreadsheet programs to treat it as plain text.
    """
    if value is None:
        return ""
    text = str(value)
    if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{text}"
    return text


def build_csv_response(filename_prefix, headers, rows, max_rows=5000):
    """
    Generates a secure, bounded CSV HttpResponse.
    Applies formula injection sanitization to all cell contents.
    Enforces a maximum row limit to prevent excessive memory/CPU usage.
    """
    filename = f"{filename_prefix}.csv"
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'

    writer = csv.writer(response)

    # Write sanitized headers
    sanitized_headers = [sanitize_csv_cell(h) for h in headers]
    writer.writerow(sanitized_headers)

    count = 0
    for row in rows:
        if count >= max_rows:
            break
        sanitized_row = [sanitize_csv_cell(cell) for cell in row]
        writer.writerow(sanitized_row)
        count += 1

    return response


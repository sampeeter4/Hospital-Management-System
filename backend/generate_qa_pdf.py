"""
Script to generate a professional PDF document containing:
- Master Test Cases Inventory
- Defect / Bug Report (BUG-001) with Remediation Details
- Senior QA Audit Summary & Metrics

Uses ReportLab with high-fidelity styles, custom palettes, and landscape layout.
"""

import os
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render total page count
    along with professional header and footer rules.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        page_w, page_h = self._pagesize

        # Running Header (pages > 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#1E293B"))
            self.drawString(36, page_h - 26, "HOSPITAL MANAGEMENT SYSTEM — QA AUDIT & DEFECT REPORT")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(page_w - 36, page_h - 26, "CONFIDENTIAL — QUALITY ASSURANCE DELIVERABLE")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.75)
            self.line(36, page_h - 30, page_w - 36, page_h - 30)

        # Running Footer (all pages)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.75)
        self.line(36, 32, page_w - 36, 32)

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 20, "Hospital Management System (HMS) • Django REST + React 19 • Senior QA Engineering")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(page_w - 36, 20, page_str)
        self.restoreState()


def build_pdf(filename):
    os.makedirs(os.path.dirname(os.path.abspath(filename)), exist_ok=True)
    doc = SimpleDocTemplate(
        filename,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=42,
        bottomMargin=42
    )

    page_w, page_h = landscape(letter)
    usable_w = page_w - 72  # 720 pt

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=10,
        spaceAfter=6
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#334155")
    )

    bold_body = ParagraphStyle(
        'BoldBody',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#0F172A")
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=0
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#1E293B")
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#0F172A")
    )

    code_cell = ParagraphStyle(
        'CodeCell',
        parent=table_cell,
        fontName='Courier',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#0F172A")
    )

    pass_badge = ParagraphStyle(
        'PassBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#047857"),
        alignment=1
    )

    fixed_badge = ParagraphStyle(
        'FixedBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0284C7"),
        alignment=1
    )

    story = []

    # -------------------------------------------------------------------------
    # 1. HEADER & META SUMMARY
    # -------------------------------------------------------------------------
    header_data = [
        [
            Paragraph("HOSPITAL MANAGEMENT SYSTEM", ParagraphStyle('HdrPre', fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.HexColor("#0D9488"), leading=11)),
            Paragraph("QA AUDIT REPORT: <b>PASS (100%)</b>", ParagraphStyle('HdrMeta', fontName='Helvetica', fontSize=8.5, textColor=colors.HexColor("#047857"), alignment=2, leading=11))
        ],
        [
            Paragraph("Master Test Cases & Formal Defect / Bug Report", title_style),
            Paragraph("<b>Date:</b> October 28, 2026<br/><b>Document:</b> QA-AUDIT-2026-PDF", ParagraphStyle('HdrDate', fontName='Helvetica', fontSize=8, textColor=colors.HexColor("#64748B"), alignment=2, leading=11))
        ]
    ]
    hdr_table = Table(header_data, colWidths=[usable_w * 0.70, usable_w * 0.30])
    hdr_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('TOPPADDING', (0,0), (-1,-1), 1),
    ]))
    story.append(hdr_table)

    story.append(Paragraph(
        "Complete enterprise quality audit verifying functional endpoints, authentication lifecycle, role-based boundaries, cross-tenant IDOR protection, billing equations, inpatient census, and defect remediation.",
        subtitle_style
    ))

    # Metric Cards Table
    card_hdr = ParagraphStyle('CHdr', fontName='Helvetica-Bold', fontSize=7.5, textColor=colors.HexColor("#64748B"), alignment=1)
    card_val = ParagraphStyle('CVal', fontName='Helvetica-Bold', fontSize=14, textColor=colors.HexColor("#0F172A"), alignment=1, spaceBefore=2)
    card_sub = ParagraphStyle('CSub', fontName='Helvetica', fontSize=6.5, textColor=colors.HexColor("#10B981"), alignment=1, spaceBefore=1)
    card_sub_red = ParagraphStyle('CSubR', fontName='Helvetica', fontSize=6.5, textColor=colors.HexColor("#64748B"), alignment=1, spaceBefore=1)

    cards_data = [
        [
            [Paragraph("TOTAL TEST CASES", card_hdr), Paragraph("26", card_val), Paragraph("Formal live audits", card_sub_red)],
            [Paragraph("TEST PASS RATE", card_hdr), Paragraph("100%", card_val), Paragraph("26 / 26 Passed", card_sub)],
            [Paragraph("REGRESSION TESTS", card_hdr), Paragraph("198", card_val), Paragraph("Django Unit Suite OK", card_sub)],
            [Paragraph("FRONTEND TESTS", card_hdr), Paragraph("10", card_val), Paragraph("Vitest Integration OK", card_sub)],
            [Paragraph("DEFECTS RESOLVED", card_hdr), Paragraph("1 / 1", card_val), Paragraph("BUG-001 Closed", card_sub)],
            [Paragraph("RELEASE STATUS", card_hdr), Paragraph("APPROVED", card_val), Paragraph("Ready for Production", card_sub)]
        ]
    ]
    card_w = usable_w / 6.0
    cards_table = Table(cards_data, colWidths=[card_w]*6)
    cards_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0,0), (-1,-1), 0.75, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(cards_table)
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # 2. MASTER TEST CASES TABLE
    # -------------------------------------------------------------------------
    story.append(Paragraph("1. Master Test Cases Inventory & Verification Log", h1_style))

    # Column widths total = 720 pt
    # ID: 62, Mod: 68, Scenario: 130, Steps & Data: 140, Expected Result: 170, Status: 75, Sev: 75
    tc_widths = [62, 68, 130, 145, 175, 75, 65]

    tc_headers = [
        Paragraph("Test ID", table_header),
        Paragraph("Module", table_header),
        Paragraph("Test Scenario", table_header),
        Paragraph("Execution Steps & Payload", table_header),
        Paragraph("Expected & Observed Result", table_header),
        Paragraph("Status", table_header),
        Paragraph("Severity", table_header),
    ]

    raw_test_cases = [
        ("TC-ENV-01", "Environment", "System Health Check", "GET /api/v1/health/\nNo auth header required", "HTTP 200 OK. Services healthy (database: healthy).", "PASS", "Critical"),
        ("TC-ENV-02", "Environment", "Swagger API Docs", "GET /api/docs/\nOpenAPI 3.0 schema inspection", "HTTP 200 OK. Swagger schema successfully generated.", "PASS", "Medium"),
        ("TC-ENV-03", "Environment", "Frontend Web App", "GET http://127.0.0.1:3000/\nVite dev server bootstrap", "HTTP 200 OK. React 19 single-page application loaded.", "PASS", "Critical"),
        ("TC-AUTH-01", "Authentication", "Valid Admin Login", "POST /api/v1/accounts/login/\n{'username': 'admin', 'password': '***'}", "HTTP 200 OK. Access and refresh JWT tokens generated.", "PASS", "Critical"),
        ("TC-AUTH-02", "Authentication", "Incorrect Password", "POST /api/v1/accounts/login/\n{'username': 'admin', 'password': 'wrong'}", "HTTP 401 Unauthorized. Access denied with proper error.", "PASS", "High"),
        ("TC-AUTH-03", "Authentication", "Non-Existent User", "POST /api/v1/accounts/login/\n{'username': 'ghost_user_9999', ...}", "HTTP 401 Unauthorized. User absence securely handled.", "PASS", "High"),
        ("TC-AUTH-04", "Authentication", "Empty Credentials", "POST /api/v1/accounts/login/\n{'username': '', 'password': ''}", "HTTP 400 Bad Request. Field validation rules active.", "PASS", "Medium"),
        ("TC-AUTH-05", "Authentication", "Token Refresh", "POST /api/v1/accounts/token/refresh/\n{'refresh': '<valid_token>'}", "HTTP 200 OK. New access token minted without re-login.", "PASS", "High"),
        ("TC-AUTH-06", "Authentication", "Tampered Token", "POST /api/v1/accounts/token/refresh/\n{'refresh': 'forged.signature.token'}", "HTTP 401 Unauthorized. Cryptographic signature verified.", "PASS", "High"),
        ("TC-AUTH-07", "Authentication", "Profile Unauthenticated", "GET /api/v1/accounts/profile/\nNo Bearer token present", "HTTP 401 Unauthorized. Protected route blocked access.", "PASS", "Critical"),
        ("TC-AUTH-08", "Authentication", "Profile Authenticated", "GET /api/v1/accounts/profile/\nAuthorization: Bearer <admin_jwt>", "HTTP 200 OK. Profile retrieved (username, role: SUPER_ADMIN).", "PASS", "High"),
        ("TC-RBAC-01", "RBAC / Staff", "Patient Accessing Staff", "GET /api/v1/staff/\nAuthorization: Bearer <patient_jwt>", "Cycle 1: 200 OK (Defect BUG-001).\nCycle 2: HTTP 403 Forbidden [VERIFIED FIXED].", "PASS (Fixed)", "High"),
        ("TC-RBAC-02", "RBAC / Wards", "Patient Accessing Wards", "GET /api/v1/inpatient/wards/\nAuthorization: Bearer <patient_jwt>", "HTTP 403 Forbidden. Clinical wards restricted from patient.", "PASS", "High"),
        ("TC-RBAC-03", "RBAC / Clinical", "Doctor Patient Access", "GET /api/v1/patients/\nAuthorization: Bearer <doctor_jwt>", "HTTP 200 OK. Doctor Dr. Sharma authorized to view roster.", "PASS", "High"),
        ("TC-RBAC-04", "RBAC / Pharmacy", "Pharmacist Drug Access", "GET /api/v1/pharmacy/medicines/\nAuthorization: Bearer <pharmacist_jwt>", "HTTP 200 OK. Pharmacist Alex authorized for drug stock.", "PASS", "High"),
        ("TC-RBAC-05", "RBAC / Lab", "Lab Tech Test Access", "GET /api/v1/laboratory/tests/\nAuthorization: Bearer <lab_tech_jwt>", "HTTP 200 OK. Lab Technician David authorized for catalogue.", "PASS", "High"),
        ("TC-RBAC-06", "RBAC / Billing", "Accountant Invoice Access", "GET /api/v1/billing/invoices/\nAuthorization: Bearer <accountant_jwt>", "HTTP 200 OK. Accountant Lisa authorized for financial ledger.", "PASS", "High"),
        ("TC-IDOR-01", "Security / IDOR", "Cross-Patient Clinical", "GET /api/v1/patients/2/\nAuthorization: Bearer <patient_john_jwt>", "HTTP 403/404 Forbidden. Patient John cannot inspect Maria.", "PASS", "Critical"),
        ("TC-IDOR-02", "Security / IDOR", "Cross-Patient Invoice", "GET /api/v1/billing/invoices/1/\nAuthorization: Bearer <patient_john_jwt>", "HTTP 403/404 Forbidden. Patient John cannot inspect Maria invoice.", "PASS", "Critical"),
        ("TC-SEC-01", "Defensive Sec", "SQL Injection Vector", "GET /api/v1/patients/?search=' OR '1'='1'\nAdmin token", "HTTP 200 OK. ORM parameterized query safely; 0 schema leaks.", "PASS", "Critical"),
        ("TC-SEC-02", "Defensive Sec", "Reflected XSS Vector", "GET /api/v1/patients/?search=<script>alert(1)</script>", "HTTP 200 OK. Payload safely escaped as literal text string.", "PASS", "High"),
        ("TC-SEC-03", "Defensive Sec", "Privilege Escalation", "POST /api/v1/accounts/register/\n{'role': 'SUPER_ADMIN', ...}", "HTTP 400 Bad Request. Blocked role elevation on registration.", "PASS", "Critical"),
        ("TC-BILL-01", "Billing & Math", "Invoice Balance Formula", "Inspect balance_due on Invoices #1 & #2\nFormula: total_amount - paid_amount", "Verified exact mathematical equality (0.00 & 320.00).", "PASS", "Critical"),
        ("TC-INP-01", "Inpatient / Wards", "Bed Census Consistency", "Inspect Ward W-GEN-01\nFormula: total_beds >= occupied + avail", "Verified consistent (3 total >= 1 occupied + 2 available).", "PASS", "High"),
        ("TC-PHARM-01", "Pharmacy Stock", "Drug Stock & Safety Alert", "Inspect Amoxicillin, Atorvastatin, Metformin\nStock count vs low_stock_threshold", "Verified stock valid (250, 180, 320 units; threshold 50).", "PASS", "Medium"),
        ("TC-UI-01", "Frontend UI", "Dark Mode Toggle", "Click Sun/Moon toggle button in TopNav\nPersist to localStorage key 'hms-theme'", "Verified .dark class added/removed on <html>; persisted.", "PASS", "Low")
    ]

    tc_rows = [tc_headers]
    for row in raw_test_cases:
        t_id, mod, scen, steps, res, st, sev = row
        status_para = Paragraph(f"<b>{st}</b>", fixed_badge if "Fixed" in st else pass_badge)
        
        # Color badge for severity
        sev_color = "#DC2626" if sev == "Critical" else ("#EA580C" if sev == "High" else ("#2563EB" if sev == "Medium" else "#64748B"))
        sev_para = Paragraph(f"<font color='{sev_color}'><b>{sev}</b></font>", ParagraphStyle('Sev', parent=table_cell_bold, alignment=1))

        tc_rows.append([
            Paragraph(f"<b>{t_id}</b>", table_cell_bold),
            Paragraph(mod, table_cell),
            Paragraph(scen, table_cell),
            Paragraph(steps.replace("\n", "<br/>"), code_cell),
            Paragraph(res.replace("\n", "<br/>"), table_cell),
            status_para,
            sev_para
        ])

    tc_table = Table(tc_rows, colWidths=tc_widths, repeatRows=1)
    
    table_style_commands = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('ALIGN', (0,0), (-1,0), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
    ]
    # Alternating row colors
    for i in range(1, len(tc_rows)):
        bg = colors.HexColor("#FFFFFF") if i % 2 == 1 else colors.HexColor("#F8FAFC")
        table_style_commands.append(('BACKGROUND', (0, i), (-1, i), bg))

    tc_table.setStyle(TableStyle(table_style_commands))
    story.append(tc_table)

    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # 3. COMPREHENSIVE DEFECT & BUG REPORT
    # -------------------------------------------------------------------------
    story.append(Paragraph("2. Formal Defect / Bug Report — Complete Technical Audit", h1_style))
    story.append(Paragraph(
        "Formal defect record logged during QA execution, including root cause analysis, security threat impact, exact code diff remediation, and regression verification.",
        subtitle_style
    ))

    bug_meta_data = [
        [
            Paragraph("<b>Bug ID:</b> BUG-001", body_style),
            Paragraph("<b>Severity:</b> <font color='#DC2626'><b>High</b></font>", body_style),
            Paragraph("<b>Priority:</b> <font color='#EA580C'><b>P1 (Urgent)</b></font>", body_style),
            Paragraph("<b>Status:</b> <font color='#047857'><b>CLOSED (VERIFIED FIXED)</b></font>", body_style)
        ],
        [
            Paragraph("<b>Module:</b> Hospitals / Staff Management (RBAC)", body_style),
            Paragraph("<b>Environment:</b> WSGI Dev (127.0.0.1:8000)", body_style),
            Paragraph("<b>Detected In:</b> QA Cycle 1 (Test TC-RBAC-01)", body_style),
            Paragraph("<b>Verified In:</b> QA Cycle 2 (Post-Remediation)", body_style)
        ]
    ]
    bug_meta_table = Table(bug_meta_data, colWidths=[usable_w * 0.25]*4)
    bug_meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF2F2")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#FCA5A5")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#FCA5A5")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(bug_meta_table)
    story.append(Spacer(1, 8))

    # Bug Details Breakdown Table
    detail_data = [
        [
            Paragraph("<b>Defect Title</b>", bold_body),
            Paragraph("Patient accounts can programmatically query complete hospital staff roster, employee IDs, and internal designations via GET /api/v1/staff/", body_style)
        ],
        [
            Paragraph("<b>Preconditions</b>", bold_body),
            Paragraph("1. User account registered with role <code>PATIENT</code> (e.g. <code>patient_john</code>)<br/>2. Valid JWT access token acquired via <code>/api/v1/accounts/login/</code>", body_style)
        ],
        [
            Paragraph("<b>Steps to Reproduce</b>", bold_body),
            Paragraph("1. Authenticate as <code>patient_john</code> using <code>POST /api/v1/accounts/login/</code><br/>2. Send HTTP request: <code>GET http://127.0.0.1:8000/api/v1/staff/</code><br/>3. Include Header: <code>Authorization: Bearer &lt;patient_jwt_token&gt;</code><br/>4. Observe HTTP response status code and data payload.", body_style)
        ],
        [
            Paragraph("<b>Expected Result</b>", bold_body),
            Paragraph("<b>HTTP 403 Forbidden</b>. Patients have no operational need to access internal staff personnel records, employee numbers, joining dates, or internal designations.", body_style)
        ],
        [
            Paragraph("<b>Actual Result (Cycle 1)</b>", bold_body),
            Paragraph("<b>HTTP 200 OK</b>. The API returned complete staff roster with unredacted employee metadata:<br/><code>[{\"id\": 1, \"employee_id\": \"EMP-NURSE-001\", \"designation\": \"Head Inpatient Nurse\", ...}, {\"id\": 2, \"employee_id\": \"EMP-RECEPT-001\", ...}]</code>", body_style)
        ],
        [
            Paragraph("<b>Root Cause Analysis</b>", bold_body),
            Paragraph("In <code>backend/hospitals/views.py</code>, <code>StaffViewSet</code> had: <code>permission_classes = [IsHospitalAdminOrReadOnly]</code>.<br/>Django REST Framework's <code>IsHospitalAdminOrReadOnly</code> permits <code>SAFE_METHODS</code> (GET, HEAD, OPTIONS) to <b>any authenticated caller</b>. Thus, patient accounts passed the check without restriction.", body_style)
        ],
        [
            Paragraph("<b>Remediation Applied</b>", bold_body),
            Paragraph("1. Developed custom permission guard <code>IsStaffPersonnel</code> in <code>backend/common/permissions.py</code> which explicitly restricts access to internal staff roles (<code>SUPER_ADMIN</code>, <code>HOSPITAL_ADMIN</code>, <code>DOCTOR</code>, <code>NURSE</code>, <code>RECEPTIONIST</code>, <code>LAB_TECHNICIAN</code>, <code>PHARMACIST</code>, <code>ACCOUNTANT</code>) and explicitly denies <code>PATIENT</code>.<br/>2. Updated <code>StaffViewSet.permission_classes = [IsStaffPersonnel]</code> in <code>backend/hospitals/views.py</code>.", body_style)
        ],
        [
            Paragraph("<b>Post-Fix Verification</b>", bold_body),
            Paragraph("Re-tested with <code>backend/qa_full_audit.py</code>. The patient request now receives strict <b>HTTP 403 Forbidden</b> with payload <code>{\"detail\": \"You do not have permission to perform this action.\"}</code>.<br/>Backend unit test suite re-executed: <b>198 / 198 passed</b> with 0 regressions.", body_style)
        ]
    ]

    detail_table = Table(detail_data, colWidths=[usable_w * 0.22, usable_w * 0.78])
    detail_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#F1F5F9")),
        ('BACKGROUND', (1,0), (1,-1), colors.white),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(detail_table)
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # 4. CODE DIFF EVIDENCE
    # -------------------------------------------------------------------------
    story.append(Paragraph("Code Remediation Diff Evidence", h2_style))

    code_diff_text = """# 1. Created IsStaffPersonnel in backend/common/permissions.py
class IsStaffPersonnel(permissions.BasePermission):
    \"\"\"Restricts access strictly to internal hospital staff and admin roles; denies PATIENT.\"\"\"
    STAFF_ROLES = [
        'SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE',
        'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST', 'ACCOUNTANT'
    ]
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser or user.role == 'SUPER_ADMIN':
            return True
        return user.role in self.STAFF_ROLES

# 2. Updated backend/hospitals/views.py
class StaffViewSet(viewsets.ModelViewSet):
-   permission_classes = [IsHospitalAdminOrReadOnly]
+   permission_classes = [IsStaffPersonnel]"""

    diff_table = Table(
        [[Paragraph(code_diff_text.replace("\n", "<br/>").replace(" ", "&nbsp;"), ParagraphStyle('CodeBox', fontName='Courier', fontSize=7, leading=9.5, textColor=colors.HexColor("#0F172A")))]],
        colWidths=[usable_w]
    )
    diff_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#94A3B8")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(diff_table)
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # 5. FORMAL QA SIGN-OFF
    # -------------------------------------------------------------------------
    sign_data = [
        [
            Paragraph("<b>QA AUDITOR SIGN-OFF</b><br/>Lead Software Test & Security Engineer<br/>Antigravity QA Core Team", body_style),
            Paragraph("<b>AUDIT VERDICT</b><br/><font color='#047857'><b>APPROVED FOR PRODUCTION DEPLOYMENT</b></font><br/>All 26 Live Test Cases Passed (100%) • Zero Open Defects", body_style),
            Paragraph("<b>SECURITY CERTIFICATION</b><br/>IDOR Protection: VERIFIED<br/>SQLi / XSS Defenses: ACTIVE<br/>RBAC Boundary Gates: ENFORCED", body_style)
        ]
    ]
    sign_table = Table(sign_data, colWidths=[usable_w / 3.0]*3)
    sign_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ECFDF5")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#A7F3D0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#A7F3D0")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(sign_table)

    # Build document with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Generated PDF: {filename} ({os.path.getsize(filename)} bytes)")


if __name__ == "__main__":
    output_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "docs", "testing", "Hospital_Management_System_Test_Cases_and_Bug_Report.pdf"
    )
    build_pdf(output_path)

import io
from datetime import datetime
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.core.database import get_db
from app.models.module import Module
from app.models.prediction import PredictionRecord

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/summary")
def get_report_summary(db: Session = Depends(get_db)):
    modules = db.query(Module).order_by(Module.last_risk_score.desc().nullslast()).all()
    predictions_count = db.query(PredictionRecord).count()

    total = len(modules)
    high = [m for m in modules if (m.last_risk_level == "High" or (m.last_risk_score or 0) > 70)]
    medium = [m for m in modules if (m.last_risk_level == "Medium" or (35 <= (m.last_risk_score or 0) <= 70))]
    low = [m for m in modules if (m.last_risk_level == "Low" or (0 <= (m.last_risk_score or 0) < 35))]

    scored = [m for m in modules if m.last_risk_score is not None]
    avg_score = round(sum(m.last_risk_score for m in scored) / len(scored), 1) if scored else 0.0

    return {
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "total_modules": total,
        "total_prediction_runs": predictions_count,
        "average_risk_score": avg_score,
        "high_risk_count": len(high),
        "medium_risk_count": len(medium),
        "low_risk_count": len(low),
        "top_high_risk_modules": [
            {
                "id": m.id,
                "name": m.name,
                "loc": m.loc,
                "complexity": m.complexity,
                "commits": m.commits,
                "risk_score": m.last_risk_score,
                "risk_level": m.last_risk_level
            }
            for m in high[:10]
        ],
        "all_modules": [
            {
                "id": m.id,
                "name": m.name,
                "loc": m.loc,
                "complexity": m.complexity,
                "commits": m.commits,
                "risk_score": m.last_risk_score or 0.0,
                "risk_level": m.last_risk_level or "Unassessed"
            }
            for m in modules
        ]
    }

@router.get("/pdf")
def export_pdf_report(db: Session = Depends(get_db)):
    """Generates a styled executive PDF bug risk assessment report."""
    modules = db.query(Module).order_by(Module.last_risk_score.desc().nullslast()).all()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        alignment=1, # Center
        spaceAfter=10
    )
    subtitle_style = ParagraphStyle(
        'ReportSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#475569"),
        alignment=1,
        spaceAfter=20
    )
    heading2_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=14,
        spaceAfter=8
    )
    body_style = styles['Normal']

    story = []

    # Title & Header
    story.append(Paragraph("AI-Based Software Bug Prediction System", title_style))
    story.append(Paragraph(f"Executive Bug Risk & Quality Assessment Report | Generated: {datetime.utcnow().strftime('%B %d, %Y')}", subtitle_style))
    story.append(Spacer(1, 10))

    # Summary Statistics
    scored = [m for m in modules if m.last_risk_score is not None]
    avg_score = round(sum(m.last_risk_score for m in scored) / len(scored), 1) if scored else 0.0
    high_count = sum(1 for m in modules if (m.last_risk_level == "High" or (m.last_risk_score or 0) > 70))
    med_count = sum(1 for m in modules if (m.last_risk_level == "Medium" or (35 <= (m.last_risk_score or 0) <= 70)))
    low_count = sum(1 for m in modules if (m.last_risk_level == "Low" or (0 <= (m.last_risk_score or 0) < 35)))

    summary_data = [
        ["Total Modules", "Average Risk Score", "High Risk (>70%)", "Medium Risk (35-70%)", "Low Risk (<35%)"],
        [str(len(modules)), f"{avg_score}%", str(high_count), str(med_count), str(low_count)]
    ]
    summary_table = Table(summary_data, colWidths=[105, 110, 110, 115, 100])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor("#f8fafc")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 15))

    # Modules Breakdown Table
    story.append(Paragraph("Software Modules Risk Matrix", heading2_style))

    table_data = [["Module Name", "LOC", "Complexity", "Commits", "Risk Score", "Risk Tier"]]
    for m in modules[:25]:
        score_val = f"{m.last_risk_score:.1f}%" if m.last_risk_score is not None else "N/A"
        tier = m.last_risk_level or "Unassessed"
        table_data.append([
            m.name[:28],
            str(m.loc),
            f"{m.complexity:.1f}",
            str(m.commits),
            score_val,
            tier
        ])

    module_table = Table(table_data, colWidths=[180, 65, 75, 70, 75, 75])
    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]
    # Highlight high risk in pale red
    for i, m in enumerate(modules[:25], start=1):
        if (m.last_risk_level == "High" or (m.last_risk_score or 0) > 70):
            t_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor("#fee2e2")))
        elif i % 2 == 0:
            t_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor("#f8fafc")))

    module_table.setStyle(TableStyle(t_style))
    story.append(module_table)
    story.append(Spacer(1, 15))

    # Executive Recommendations Section
    story.append(Paragraph("Strategic Defect Mitigation Recommendations", heading2_style))
    rec_text = (
        "1. <b>Prioritize High-Risk Modules:</b> Immediately schedule refactoring for modules exhibiting Cyclomatic Complexity &gt; 20 "
        "and churn &gt; 30 commits.<br/>"
        "2. <b>Test Automation &amp; Branch Coverage:</b> Require &gt; 85% branch coverage and mutation testing on all high-risk modules prior to release.<br/>"
        "3. <b>Enforce CI/CD Quality Gates:</b> Block pull requests that introduce additional branching complexity or exceed 500 lines per single file.<br/>"
        "4. <b>Peer Review Protocol:</b> Enforce mandatory two-person code reviews for high-churn software components."
    )
    story.append(Paragraph(rec_text, body_style))

    doc.build(story)
    pdf_value = buffer.getvalue()
    buffer.close()

    return Response(
        content=pdf_value,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=software_bug_risk_report_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
        }
    )

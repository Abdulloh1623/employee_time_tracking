package com.timegate.service;

import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;

/** Exports a simple table to a PDF document (OpenPDF). */
final class PdfExporter {
    private PdfExporter() {}

    private static final Color BLUE = new Color(31, 78, 121);
    private static final Color ALT = new Color(234, 241, 248);

    static byte[] export(String title, List<String> headers, List<List<String>> rows) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4.rotate(), 28, 28, 30, 30);
            PdfWriter.getInstance(doc, out);
            doc.open();

            Font titleFont = new Font(Font.HELVETICA, 14, Font.BOLD, BLUE);
            Paragraph p = new Paragraph(title, titleFont);
            p.setSpacingAfter(12f);
            doc.add(p);

            PdfPTable table = new PdfPTable(headers.size());
            table.setWidthPercentage(100);

            Font headFont = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headFont));
                cell.setBackgroundColor(BLUE);
                cell.setPadding(5f);
                table.addCell(cell);
            }

            Font cellFont = new Font(Font.HELVETICA, 9);
            boolean alt = false;
            for (List<String> row : rows) {
                Color bg = alt ? ALT : Color.WHITE;
                for (String val : row) {
                    PdfPCell cell = new PdfPCell(new Phrase(val == null ? "" : val, cellFont));
                    cell.setBackgroundColor(bg);
                    cell.setPadding(4f);
                    table.addCell(cell);
                }
                alt = !alt;
            }
            doc.add(table);
            doc.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to build PDF: " + e.getMessage(), e);
        }
    }
}

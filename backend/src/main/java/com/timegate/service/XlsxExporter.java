package com.timegate.service;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.util.List;

/** Exports a simple table to an XLSX workbook (Apache POI). */
final class XlsxExporter {
    private XlsxExporter() {}

    static byte[] export(String title, List<String> headers, List<List<String>> rows) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet(safeSheetName(title));

            CellStyle headStyle = wb.createCellStyle();
            Font headFont = wb.createFont();
            headFont.setBold(true);
            headFont.setColor(IndexedColors.WHITE.getIndex());
            headStyle.setFont(headFont);
            headStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.size(); i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(headers.get(i));
                c.setCellStyle(headStyle);
            }
            int r = 1;
            for (List<String> row : rows) {
                Row excelRow = sheet.createRow(r++);
                for (int i = 0; i < row.size(); i++) {
                    Cell c = excelRow.createCell(i);
                    String val = row.get(i);
                    Double num = tryNumber(val);
                    if (num != null) c.setCellValue(num);
                    else c.setCellValue(val == null ? "" : val);
                }
            }
            for (int i = 0; i < headers.size(); i++) sheet.autoSizeColumn(i);

            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to build XLSX: " + e.getMessage(), e);
        }
    }

    private static Double tryNumber(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Double.parseDouble(s.replace(" ", "")); }
        catch (NumberFormatException e) { return null; }
    }

    private static String safeSheetName(String name) {
        String n = name.replaceAll("[\\\\/?*\\[\\]:]", " ").trim();
        return n.length() > 31 ? n.substring(0, 31) : (n.isEmpty() ? "Report" : n);
    }
}

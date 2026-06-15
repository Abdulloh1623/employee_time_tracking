package com.timegate.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Pure unit tests for the table exporters (no Spring context). */
class ExporterTest {

    private final List<String> headers = List.of("Xodim", "Netto");
    private final List<List<String>> rows = List.of(
        List.of("Valiyev Ali", "360000"),
        List.of("Karimova Lola", "5200000"));

    @Test
    void xlsxStartsWithZipSignature() {
        byte[] out = XlsxExporter.export("Test", headers, rows);
        assertThat(out).isNotEmpty();
        // XLSX is a ZIP archive -> starts with "PK" (0x50 0x4B)
        assertThat(out[0]).isEqualTo((byte) 0x50);
        assertThat(out[1]).isEqualTo((byte) 0x4B);
    }

    @Test
    void pdfStartsWithPdfSignature() {
        byte[] out = PdfExporter.export("Test", headers, rows);
        assertThat(out).isNotEmpty();
        // PDF files start with "%PDF"
        String head = new String(out, 0, 4);
        assertThat(head).isEqualTo("%PDF");
    }

    @Test
    void xlsxHandlesEmptyRows() {
        byte[] out = XlsxExporter.export("Empty", headers, List.of());
        assertThat(out).isNotEmpty();
    }
}

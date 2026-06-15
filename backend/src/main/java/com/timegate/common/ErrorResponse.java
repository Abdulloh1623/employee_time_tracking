package com.timegate.common;

import java.util.Map;

public record ErrorResponse(String code, String message, Map<String, java.util.List<String>> errors) {
    public static ErrorResponse of(String code, String message) {
        return new ErrorResponse(code, message, null);
    }
}

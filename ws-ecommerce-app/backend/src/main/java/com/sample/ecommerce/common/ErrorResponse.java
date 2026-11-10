package com.sample.ecommerce.common;

import java.util.Map;

public record ErrorResponse(String code, String message, Map<String, String> fields) {
}

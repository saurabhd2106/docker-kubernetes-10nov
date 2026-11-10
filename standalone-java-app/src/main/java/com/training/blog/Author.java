package com.training.blog;

import java.util.Arrays;
import java.util.stream.Collectors;

record Author(String id, String name, String role, String bio, String color) {

    String url() {
        return "/authors/" + id;
    }

    String initials() {
        return Arrays.stream(name.split("\\s+"))
                .filter(part -> !part.isEmpty())
                .map(part -> part.substring(0, 1).toUpperCase())
                .limit(2)
                .collect(Collectors.joining());
    }
}

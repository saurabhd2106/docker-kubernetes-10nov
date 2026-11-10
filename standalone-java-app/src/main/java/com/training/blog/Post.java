package com.training.blog;

import java.time.LocalDate;
import java.util.List;

record Post(
        String slug,
        String title,
        LocalDate date,
        Category category,
        List<String> tags,
        Author author,
        String cover,
        String summary,
        String body,
        int readingMinutes) {

    String url() {
        return "/posts/" + slug;
    }
}

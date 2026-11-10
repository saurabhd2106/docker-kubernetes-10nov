package com.training.blog;

record Category(String slug, String name, String description, String color) {

    String url() {
        return "/category/" + slug;
    }
}

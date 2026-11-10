package com.training.blog;

import java.util.List;
import java.util.Map;

/** Everything loaded from {@code content/}. Posts are sorted newest first; maps keep declaration order. */
record Site(
        List<Post> posts,
        Map<String, Category> categories,
        Map<String, Author> authors,
        ContentLoader.Document about) {

    List<Post> postsIn(Category category) {
        return posts.stream().filter(post -> post.category().equals(category)).toList();
    }

    List<Post> postsBy(Author author) {
        return posts.stream().filter(post -> post.author().equals(author)).toList();
    }
}

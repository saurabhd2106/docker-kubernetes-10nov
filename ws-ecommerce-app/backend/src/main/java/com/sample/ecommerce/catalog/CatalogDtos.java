package com.sample.ecommerce.catalog;

import java.util.List;

public final class CatalogDtos {

    private CatalogDtos() {
    }

    public record CategoryResponse(Long id, String name, String slug) {
    }

    public record ProductSummaryResponse(
            Long id,
            String sku,
            String name,
            String description,
            int priceCents,
            String imagePath,
            int stockQuantity,
            String categorySlug,
            String categoryName
    ) {
    }

    public record ProductPageResponse(
            List<ProductSummaryResponse> items,
            int page,
            int size,
            long total
    ) {
    }
}

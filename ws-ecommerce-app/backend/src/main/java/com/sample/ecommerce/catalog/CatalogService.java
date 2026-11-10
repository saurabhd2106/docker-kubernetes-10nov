package com.sample.ecommerce.catalog;

import com.sample.ecommerce.common.ApiException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CatalogService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public CatalogService(CategoryRepository categoryRepository, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<CatalogDtos.CategoryResponse> listCategories() {
        return categoryRepository.findAll(Sort.by("name")).stream()
                .map(c -> new CatalogDtos.CategoryResponse(c.getId(), c.getName(), c.getSlug()))
                .toList();
    }

    @Transactional(readOnly = true)
    public CatalogDtos.ProductPageResponse listProducts(
            String category,
            String q,
            Integer minPrice,
            Integer maxPrice,
            String sort,
            int page,
            int size) {
        String categorySlug = blankToNull(category);
        String query = blankToNull(q);
        if (categorySlug != null && categoryRepository.findBySlug(categorySlug).isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND", "Category not found");
        }
        if (minPrice != null && minPrice < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PRICE", "minPrice must be >= 0");
        }
        if (maxPrice != null && maxPrice < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PRICE", "maxPrice must be >= 0");
        }
        if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PRICE", "minPrice cannot exceed maxPrice");
        }

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        PageRequest pageable = PageRequest.of(safePage, safeSize, resolveSort(sort));
        Page<Product> result = productRepository.search(categorySlug, query, minPrice, maxPrice, pageable);
        List<CatalogDtos.ProductSummaryResponse> items = result.getContent().stream()
                .map(this::toSummary)
                .toList();
        return new CatalogDtos.ProductPageResponse(items, result.getNumber(), result.getSize(), result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public CatalogDtos.ProductSummaryResponse getProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found"));
        return toSummary(product);
    }

    private Sort resolveSort(String sort) {
        if (sort == null || sort.isBlank() || "id".equalsIgnoreCase(sort)) {
            return Sort.by("id").ascending();
        }
        return switch (sort.trim().toLowerCase()) {
            case "price_asc" -> Sort.by("priceCents").ascending().and(Sort.by("id").ascending());
            case "price_desc" -> Sort.by("priceCents").descending().and(Sort.by("id").ascending());
            case "name" -> Sort.by("name").ascending().and(Sort.by("id").ascending());
            default -> throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_SORT",
                    "sort must be one of: id, price_asc, price_desc, name");
        };
    }

    private CatalogDtos.ProductSummaryResponse toSummary(Product product) {
        Category category = product.getCategory();
        return new CatalogDtos.ProductSummaryResponse(
                product.getId(),
                product.getSku(),
                product.getName(),
                product.getDescription(),
                product.getPriceCents(),
                product.getImagePath(),
                product.getStockQuantity(),
                category.getSlug(),
                category.getName()
        );
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}

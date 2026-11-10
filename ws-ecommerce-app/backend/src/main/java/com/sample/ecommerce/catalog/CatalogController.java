package com.sample.ecommerce.catalog;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CatalogController {

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/categories")
    public List<CatalogDtos.CategoryResponse> categories() {
        return catalogService.listCategories();
    }

    @GetMapping("/products")
    public CatalogDtos.ProductPageResponse products(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer minPrice,
            @RequestParam(required = false) Integer maxPrice,
            @RequestParam(required = false, defaultValue = "id") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return catalogService.listProducts(category, q, minPrice, maxPrice, sort, page, size);
    }

    @GetMapping("/products/{id}")
    public CatalogDtos.ProductSummaryResponse product(@PathVariable Long id) {
        return catalogService.getProduct(id);
    }
}

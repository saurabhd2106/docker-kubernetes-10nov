package com.sample.ecommerce.catalog;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    boolean existsBySku(String sku);

    @Query("""
            SELECT p FROM Product p
            JOIN p.category c
            WHERE (:categorySlug IS NULL OR c.slug = :categorySlug)
              AND (:q IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                   OR LOWER(p.description) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
              AND (:minPrice IS NULL OR p.priceCents >= :minPrice)
              AND (:maxPrice IS NULL OR p.priceCents <= :maxPrice)
            """)
    Page<Product> search(
            @Param("categorySlug") String categorySlug,
            @Param("q") String q,
            @Param("minPrice") Integer minPrice,
            @Param("maxPrice") Integer maxPrice,
            Pageable pageable);

    Optional<Product> findBySku(String sku);
}

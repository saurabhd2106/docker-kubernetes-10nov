package com.sample.ecommerce.order;

import com.sample.ecommerce.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<ShopOrder, Long> {

    @Query("""
            SELECT DISTINCT o FROM ShopOrder o
            LEFT JOIN FETCH o.items i
            LEFT JOIN FETCH i.product
            WHERE o.user = :user
            """)
    List<ShopOrder> findByUserWithItems(@Param("user") User user);

    @Query("""
            SELECT DISTINCT o FROM ShopOrder o
            LEFT JOIN FETCH o.items i
            LEFT JOIN FETCH i.product
            WHERE o.id = :id AND o.user = :user
            """)
    Optional<ShopOrder> findByIdAndUserWithItems(@Param("id") Long id, @Param("user") User user);
}

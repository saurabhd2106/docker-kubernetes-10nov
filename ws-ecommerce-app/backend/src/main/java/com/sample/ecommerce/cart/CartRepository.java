package com.sample.ecommerce.cart;

import com.sample.ecommerce.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {

    Optional<Cart> findByUser(User user);

    @Query("""
            SELECT DISTINCT c FROM Cart c
            LEFT JOIN FETCH c.items i
            LEFT JOIN FETCH i.product p
            LEFT JOIN FETCH p.category
            WHERE c.user = :user
            """)
    Optional<Cart> findByUserWithItems(@Param("user") User user);
}

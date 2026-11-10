import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

export function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  function onSubscribe(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
    setEmail('')
  }

  return (
    <>
      <section className="newsletter">
        <div className="newsletter-inner">
          <div>
            <h2>Get first dibs on new arrivals</h2>
            <p>Weekly drops, early access deals, and Oakline tips. Demo signup only.</p>
          </div>
          <form className="newsletter-form" onSubmit={onSubscribe}>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit">Subscribe</button>
          </form>
          {subscribed && <p className="success">Thanks — you&apos;re on the list.</p>}
        </div>
      </section>
      <footer className="site-footer" id="site-footer" data-testid="site-footer">
        <div className="footer-inner">
          <div className="footer-col">
            <h2>Oakline</h2>
            <p>
              Everyday essentials with a calm, considered storefront. Browse,
              search, and try the full demo checkout journey.
            </p>
            <div className="social-row" aria-label="Social">
              <span>Ig</span><span>X</span><span>Fb</span><span>in</span>
            </div>
          </div>
          <div className="footer-col">
            <h3>Shop</h3>
            <ul>
              <li><Link to="/">All departments</Link></li>
              <li><Link to="/?category=electronics">Electronics</Link></li>
              <li><Link to="/?category=clothing">Clothing</Link></li>
              <li><Link to="/?deals=1">Today&apos;s deals</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Customer care</h3>
            <ul>
              <li><Link to="/orders">Track order</Link></li>
              <li><a href="#site-footer">Shipping</a></li>
              <li><a href="#site-footer">Returns</a></li>
              <li><a href="#site-footer">Help Center</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Company</h3>
            <ul>
              <li><a href="#site-footer">About</a></li>
              <li><a href="#site-footer">Careers</a></li>
              <li><a href="#site-footer">Press</a></li>
              <li><a href="#site-footer">Sustainability</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Your account</h3>
            <ul>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Create account</Link></li>
              <li><Link to="/orders">Orders</Link></li>
              <li><Link to="/cart">Cart</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-contact">
          <div>
            <strong>Visit our store</strong>
            100 Market Street, Austin, TX 78701
          </div>
          <div>
            <strong>Call us</strong>
            +1 (512) 555-0142
          </div>
          <div>
            <strong>Email</strong>
            <a href="mailto:hello@oakline.demo">hello@oakline.demo</a>
          </div>
          <div>
            <strong>Store hours</strong>
            Mon–Fri 9–6 · Sat 10–4 · Sun Closed
          </div>
        </div>
        <div className="footer-bottom">
          <div className="pay-icons" aria-label="Payment methods">
            <span>Visa</span><span>MC</span><span>Amex</span><span>PayPal</span><span>Apple</span><span>GPay</span>
          </div>
          <p>© {new Date().getFullYear()} Oakline. Demo only — no real orders or payments.</p>
          <div className="legal-links">
            <a href="#site-footer">Privacy Policy</a>
            <a href="#site-footer">Terms of Service</a>
            <a href="#site-footer">Cookies</a>
          </div>
        </div>
      </footer>
    </>
  )
}

import React, { useState } from "react";

import HeroSection from "../components/HeroSection.component";
import Footer from "../components/Footer.component";

import styles from "../styles/contact.module.css";
import { FaFacebookF, FaGithub, FaLinkedin, FaEnvelope, FaLifeRing, FaClock, FaBookOpen, FaCheckCircle } from "react-icons/fa";

const Contact = () => {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
    };

    return (
        <>
            <HeroSection
                title="Contact Us"
                subtitle="We'd love to hear from you! Fill out the form and we'll get back to you soon."
            />
            <div className={styles.contactPage}>
                <div className={`${styles.blob} ${styles.blobA}`}></div>
                <div className={`${styles.blob} ${styles.blobB}`}></div>

                <div className={styles.contactWrap}>
                    <div className={styles.contactCard}>
                        <h1 className={styles.heading}>Contact Us</h1>
                        <p className={styles.subheading}>
                            We'd love to hear from you! Fill out the form and we'll get back to you soon.
                        </p>
                        <form className={styles.form} onSubmit={handleSubmit}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="name">Name</label>
                                <input id="name" name="name" type="text" required autoComplete="off" />
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="email">Email</label>
                                <input id="email" name="email" type="email" required autoComplete="off" />
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="message">Message</label>
                                <textarea id="message" name="message" rows={5} required className={styles.inputTextarea} />
                            </div>
                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={submitted}
                            >
                                {submitted ? (
                                    <span className={styles.loader}></span>
                                ) : (
                                    "Send Message"
                                )}
                            </button>
                            {submitted && (
                                <div className={styles.successMsg}>
                                    Thank you! We'll be in touch soon.
                                </div>
                            )}
                        </form>
                    </div>

                    <aside className={styles.supportCard}>
                        <h2 className={styles.supportTitle}>
                            <FaLifeRing className={styles.socialIcon} /> Support
                        </h2>
                        <p className={styles.supportText}>
                            Prefer not to use the form? Reach us directly and follow updates below.
                        </p>

                        <div className={styles.emailBox}>
                            <FaEnvelope className={styles.socialIcon} />
                            <a className={styles.emailLink} href="mailto:support@clipifyit.com">support@clipifyit.com</a>
                        </div>

                        <div className={styles.socialList}>
                            <a
                                className={styles.socialLink}
                                href="https://github.com/clipifyit"
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                aria-label="Visit our GitHub"
                                title="GitHub"
                            >
                                <FaGithub className={styles.socialIcon} /> GitHub
                            </a>
                            <a
                                className={styles.socialLink}
                                href="https://www.linkedin.com/company/clipifyit/"
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                aria-label="Visit our LinkedIn"
                                title="LinkedIn"
                            >
                                <FaLinkedin className={styles.socialIcon} /> LinkedIn
                            </a>
                            <a
                                className={styles.socialLink}
                                href="https://www.facebook.com/clipifyit"
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                aria-label="Visit our Facebook"
                                title="Facebook"
                            >
                                <FaFacebookF className={styles.socialIcon} /> Facebook
                            </a>
                        </div>

                        <p className={styles.supportText}>
                            <FaClock className={styles.socialIcon} /> Typical response time: within 24 hours.
                        </p>
                        <a href="/faq" className={styles.socialLink} title="View our FAQ">
                            <FaBookOpen className={styles.socialIcon} /> View our FAQ
                        </a>
                        <p className={styles.supportText}>
                            <FaCheckCircle className={styles.socialIcon} /> Status: All systems operational
                        </p>
                    </aside>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default Contact;
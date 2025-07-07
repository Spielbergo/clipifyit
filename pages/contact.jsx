import React, { useState } from "react";

import HeroSection from "../components/HeroSection.component";
import Footer from "../components/Footer.component";

import styles from "../styles/contact.module.css";

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
            </div>
            <Footer />
        </>
    );
};

export default Contact;
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';

import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

import { navigation } from '../data';
import services from '../data/services';


import DarkModeToggle from '../components/DarkModeToggle';
import Socials from './SocialIcons.component';
// import ContactForm from './ContactForm.component';
// import Button from './Button.component';
// import Modal from './Modal.component';
// import { useModal } from '../contexts/ModalContext';

import styles from './navigation.module.css';

import NavLogoWhite from '../public/logos/logo-light-text.png';

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [submenuVisible, setSubmenuVisible] = useState(false);
  const navRef = useRef();
  const router = useRouter();
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  // const { openModal } = useModal();

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    await signOut(auth);
    setDropdownOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navItems = JSON.parse(JSON.stringify(navigation));
  const servicesNavItem = navItems.find(item => item.id === 'services');
  // servicesNavItem.subLinks = services.map(service => ({
  //   id: service.slug,
  //   anchor: service.title,
  //   link: `/services/${service.slug}`,
  // }));

  const handleMouseOver = () => {
    setSubmenuVisible(true);
  };

  const handleMouseLeave = () => {
    setSubmenuVisible(false);
  };

  const isActiveService = router.pathname.includes('services');
  const isActiveBlog = router.pathname.includes('blog');

  return (
    <nav ref={navRef} className={`${styles.main_nav__nav} ${scrolled ? styles.main_nav__scrolled : ''}`}>
      <div className={`${styles.main_nav__container} ${scrolled ? styles.main_container__scrolled : ''}`}>
        <div>
          <Link href="/">
            <Image
              src={NavLogoWhite}
              className={styles.main_nav__logo}
              alt="Clipify It logo"
              aria-label="Clipify It logo"
              width="150"
              height="50"
              priority
            />
          </Link>
        </div>

        <div className={styles.main_nav__links_container}>
          <ul className={styles.main_nav__navLinks}>
            {navItems
            .filter(nav => !(user && nav.id === 'login')) // Hide login if user is logged in
            .map((nav) => (
              <li
                key={nav.id}
                className={`${(router.pathname === nav.link || (nav.id === 'services' && isActiveService) || (nav.id === 'blog' && isActiveBlog)) ? styles.active : ''}`}
                onMouseOver={nav.id === 'services' ? handleMouseOver : null}
                onMouseLeave={nav.id === 'services' ? handleMouseLeave : null}
              >
                <Link
                  href={nav.link}
                  className={`${router.pathname === nav.link || (nav.id === 'services' && isActiveService) || (nav.id === 'blog' && isActiveBlog) ? styles.active : ''}`}
                >
                  {nav.anchor}
                </Link>
                {/* {nav.id === 'services' && (
                  <ul className={`${styles.main_nav__subLinks} ${submenuVisible ? styles.main_nav__sublinks_visible : ''}`}>
                    {servicesNavItem.subLinks.map(subLink => (
                      <li key={subLink.id}>
                        <Link href={subLink.link} className={router.pathname === subLink.link ? styles.active : ''}>
                          {subLink.anchor}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )} */}
              </li>
            ))}
          </ul>

          <ul style={{ display: 'flex', alignItems: 'center', listStyle: 'none', margin: 0, padding: 0 }}>
            {/* {socialIcons.map((socials) => (
              <li key={socials.id}>
                <Link href={socials.link} target="_blank" rel="noopener nofollow noreferrer" title={socials.title} aria-label={socials.title} className={styles.main_nav__social_icons_false}><socials.icon /></Link>
              </li>
            ))} */}
            <li>
              {/* <Button
                variant="get_a_quote"
                onClick={() => openModal('getAQuote')}>
                Get a Quote
              </Button> */}
              <DarkModeToggle />
            </li>
            {user && (
              <li style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((open) => !open)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label="User menu"
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#6599a6',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: 18,
                      marginRight: 8,
                      textTransform: 'uppercase',
                      userSelect: 'none',
                    }}
                  >
                    {(user.displayName || user.email || '?')[0]}
                  </span>
                  {/* <svg width="16" height="16" style={{ marginLeft: 4, fill: '#fff' }} viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg> */}
                </button>
                {dropdownOpen && (
                  <ul
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '120%',
                      background: '#fff',
                      color: '#333',
                      border: '1px solid #ccc',
                      borderRadius: 8,
                      minWidth: 160,
                      zIndex: 1000,
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                    }}
                  >
                    <li>
                      <a
                        href="/profile"
                        style={{
                          display: 'block',
                          padding: '12px 20px',
                          textDecoration: 'none',
                          color: '#333',
                          borderBottom: '1px solid #eee',
                          fontSize: 15,
                        }}
                      >
                        Profile
                      </a>
                    </li>
                    <li>
                      <button
                        onClick={handleLogout}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '12px 20px',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: '#d32f2f',
                          fontSize: 15,
                        }}
                      >
                        Logout
                      </button>
                    </li>
                  </ul>
                )}
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* <Modal modalName="getAQuote">
        <div>
            <h2>Get a Quote</h2>
            <p>Please fill out the form below to get a quote.</p>
            <br />
            <ContactForm />
        </div>
        
      </Modal> */}
    </nav>
  );
};

export default Navigation;
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

import { useAuth } from '../contexts/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

import Image from 'next/image';
import Link from 'next/link';

// import { useModal } from '../contexts/ModalContext';

import { navigation } from '../data';
import services from '../data/services';

import Socials from './SocialIcons.component';
// import ContactForm from './ContactForm.component';
// import Button from './Button.component';
// import Modal from './Modal.component';

import { BsXCircle } from 'react-icons/bs';

import styles from './navigation-mobile.module.css';

import DarkModeToggle from '../components/DarkModeToggle';
import NavLogoWhite from '../public/logos/logo-light-text.png';

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileToggleOpen, setMobileToggleOpen] = useState(false);
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navRef = useRef();
  const router = useRouter();
  // const { openModal } = useModal();

  const handleLogout = async () => {
      await signOut(auth);
      setDropdownOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target) && mobileToggleOpen) {
        setMobileToggleOpen(false);
        setActiveSubmenu(null);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileToggleOpen]);

  const handleMobileToggle = () => {
    setMobileToggleOpen(prevState => !prevState);
  };  

  const handleCloseMobileNav = () => {
    setMobileToggleOpen(false);
    setActiveSubmenu(null);
  };

  const navItems = JSON.parse(JSON.stringify(navigation));
  const servicesNavItem = navItems.find(item => item.id === 'services');

  // Determine if the link is active
  const isActiveLink = (link) => {
    return router.pathname === link || router.pathname.startsWith(link) && link !== '/';
  };

  return (
    <nav ref={navRef} className={`${styles.main_nav__nav} ${scrolled ? styles.main_nav__scrolled : ''} ${mobileToggleOpen ? styles.main_nav__container_grey : ''}`}>
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
          <div>
            <ul className={`${styles.main_nav__navLinks} ${mobileToggleOpen ? styles.main_nav__navLinks_visible : ''}`}>              
                {navItems.map((nav) => (
                  <li key={nav.id} >                  
                      <Link href={nav.link} className={isActiveLink(nav.link) ? styles.active : ''} onClick={handleCloseMobileNav}>{nav.anchor}</Link>                    
                  </li>
                ))
               }
              <span className={styles.main_nav__mobile_links}>
                <li><Socials /></li>
              </span>
            </ul>
          </div>

          <ul className={styles.main_nav__social_icons}>
            {/* {socialIcons.map((socials) => (
              <li key={socials.id}>
                <Link href={socials.link} target="_blank" rel="noopener nofollow noreferrer" title={socials.title} aria-label={socials.title} className={styles.main_nav__social_icons_false}><socials.icon /></Link>
              </li>
            ))} */}
            {/* <li>
              <Button
                variant="get_a_quote"
                onClick={() => openModal('getAQuote')}>
                Get a Quote
              </Button>
            </li> */}
            <li>
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
            <li className={styles.main_nav__toggle} onClick={handleMobileToggle}>
              <div className={styles.hamburger}>
                <div className={`${styles.bar} ${mobileToggleOpen ? styles.bar1_open : ''}`}></div>
                <div className={`${styles.bar} ${mobileToggleOpen ? styles.bar2_open : ''}`}></div>
                <div className={`${styles.bar} ${mobileToggleOpen ? styles.bar3_open : ''}`}></div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* <Modal modalName="getAQuote">
        <h2>Get a Quote</h2>
        <p>Please fill out the form below to get a quote.</p>
        <br />
        <ContactForm />
      </Modal> */}
    </nav>
  );
};

export default Navigation;

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

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

// import NavLogoWhite from '../public/logos/logo-light.png';

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileToggleOpen, setMobileToggleOpen] = useState(false);
  const navRef = useRef();
  const router = useRouter();
  // const { openModal } = useModal();

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
          {/* <Link href="/">
            <Image
              src={NavLogoWhite}
              className={styles.main_nav__logo}
              alt="Web Cheddar logo"
              aria-label="Web Cheddar logo"
              width="150"
              height="50"
              priority
            />
            
          </Link> */}
          <h1>Clipify It</h1>
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

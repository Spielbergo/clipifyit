import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';

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
  // const { openModal } = useModal();

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
              alt="Web Cheddar logo"
              aria-label="Web Cheddar logo"
              width="150"
              height="50"
              priority
            />
          </Link>
        </div>

        <div className={styles.main_nav__links_container}>
          <ul className={styles.main_nav__navLinks}>
            {navItems.map((nav) => (
              <li key={nav.id}
                  className={`${(router.pathname === nav.link || (nav.id === 'services' && isActiveService) || (nav.id === 'blog' && isActiveBlog)) ? styles.active : ''}`}
                  onMouseOver={nav.id === 'services' ? handleMouseOver : null}
                  onMouseLeave={nav.id === 'services' ? handleMouseLeave : null}>
                <Link href={nav.link} className={`${router.pathname === nav.link || (nav.id === 'services' && isActiveService) || (nav.id === 'blog' && isActiveBlog) ? styles.active : ''}`}>
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

          <ul>
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
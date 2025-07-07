import { FaFacebookF, FaGithub, FaLinkedin, FaMapMarkerAlt, FaShopify } from "react-icons/fa";
import { SiNextdotjs, SiPhp, SiWoocommerce  } from "react-icons/si";

export const navigation = [
    {
        id: "home",
        anchor: 'Home',
        link: '/',
    },
    {
        id: "app",
        anchor: 'App',
        link: '/app',
    },
    {
        id: "prices",
        anchor: 'Prices',
        link: '/prices',
    },
    {
        id: "faq",
        anchor: 'FAQ',
        link: '/faq',
    },
    {
        id: "contact",
        anchor: 'Contact',
        link: '/contact',
    },
    {
        id: "login",
        anchor: 'Login',
        link: '/pro',
    },
];

export const socialIcons = [
    {
        id: "facebook",
        icon: FaFacebookF,
        link: 'https://www.facebook.com/clipifyit',
        title: 'Facebook',
    },
    {
        id: "github",
        icon: FaGithub,
        link: 'https://github.com/clipifyit',
        title: 'GitHub',
    },
    {
        id: "linkedin",
        icon: FaLinkedin,
        link: 'https://www.linkedin.com/company/clipifyit/',
        title: 'LinkedIn',
    },
];
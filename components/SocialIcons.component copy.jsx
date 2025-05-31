import { socialIcons } from "../data";

import styles from './social-icons.module.css';

const SocialIcons = () => {
    return (
        <>
        {/* Social Icons */}
        <div>
            <ul className={`${styles.social_icons__component}`}>   
            {socialIcons.map((socials) =>          
                <li key={socials.id}><a href={socials.link} target="_blank" title={socials.title} aria-label={socials.title} rel="noopener nofollow noreferrer"><socials.icon /></a></li>
                )
            }       
            </ul>
        </div>
        </>
    )
}

export default SocialIcons;

import styles from './loader.module.css';

export default function Loader({ size = 48 }) {
  return (
    <div
      className={styles.loader}
      style={{ width: size, height: size, borderWidth: size / 12 }}
      aria-label="Loading"
      role="status"
    />
  );
}
import styles from './comparison-table.module.css';

export default function FeatureComparisonTable() {
  return (
    <section className={styles.pricing_page__section}>
      <div className={styles.comparisonWrapper}>
        <h2 className={styles.comparisonTitle}>Compare Features</h2>
        <table className={styles.comparisonTable}>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Free</th>
              <th>Pro</th>
              <th className={styles.proPlusCol}>
                Pro Plus<br /><span className={styles.comingSoon}>Coming Soon</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Clipboard History</td>
              <td>Limited</td>
              <td><span className={styles.check}></span> Unlimited</td>
              <td><span className={styles.check}></span> Unlimited + AI Search</td>
            </tr>
            <tr>
              <td>Instant Search</td>
              <td><span className={styles.check}>✔</span></td>
              <td><span className={styles.check}>✔</span></td>
              <td><span className={styles.check}></span> + Smart Suggestions</td>
            </tr>
            <tr>
              <td>Folders & Organization</td>
              <td></td>
              <td><span className={styles.check}>✔</span></td>
              <td><span className={styles.check}></span> + Nested Folders</td>
            </tr>
            <tr>
              <td>Cloud Sync</td>
              <td></td>
              <td><span className={styles.check}>✔</span></td>
              <td><span className={styles.check}></span> + Multi-device</td>
            </tr>
            <tr>
              <td>Export to CSV/Text</td>
              <td><span className={styles.check}>✔</span></td>
              <td><span className={styles.check}>✔</span></td>
              <td><span className={styles.check}>✔</span></td>
            </tr>
            <tr>
              <td>Priority Support</td>
              <td></td>
              <td><span className={styles.check}>✔</span></td>
              <td><span className={styles.check}></span> + 24/7 Chat</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
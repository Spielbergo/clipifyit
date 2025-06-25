const plans = [
  {
    name: "Free Forever",
    price: "$0",
    period: "",
    features: [
      "Unlimited local clipboard history",
      "Basic search",
      "Manual backup/restore",
      "No login required",
    ],
    button: { text: "Get Started", link: "/app", variant: "primary" },
    highlight: false,
  },
  {
    name: "Pro",
    price: "$0.99",
    period: "/mo",
    features: [
      "Cloud clipboard sync",
      "Access anywhere",
      "Priority support",
      "All Free features",
    ],
    button: { text: "Go Pro", link: "/app", variant: "accent" },
    highlight: true,
  },
  {
    name: "Pro Plus",
    price: "$1.99",
    period: "/mo",
    features: [
      "All Pro features",
      "Unlimited history",
      'Paste Images & Files',
      "Team sharing (coming soon)",
      "Advanced analytics",
      "Early access to new features",
    ],
    button: { text: "Go Pro Plus", link: "/app", variant: "secondary" },
    highlight: false,
  },
];

export default plans;
/* @ds-bundle: {"format":3,"namespace":"MedtronicLABSDesignSystem_019e1f","components":[{"name":"Avatar","sourcePath":"components/data-display/Avatar.jsx"},{"name":"Card","sourcePath":"components/data-display/Card.jsx"},{"name":"StatCard","sourcePath":"components/data-display/StatCard.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"Badge","sourcePath":"components/feedback/Badge.jsx"},{"name":"ProgressBar","sourcePath":"components/feedback/ProgressBar.jsx"},{"name":"Tag","sourcePath":"components/feedback/Tag.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Breadcrumb","sourcePath":"components/navigation/Breadcrumb.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/data-display/Avatar.jsx":"5fb88d3c6cef","components/data-display/Card.jsx":"a6b4ed24ee6b","components/data-display/StatCard.jsx":"2a61e3eff981","components/feedback/Alert.jsx":"68d4074fc112","components/feedback/Badge.jsx":"d795a129fa2f","components/feedback/ProgressBar.jsx":"79342baf375c","components/feedback/Tag.jsx":"23b392dcd12f","components/feedback/Tooltip.jsx":"4164e72ee007","components/forms/Button.jsx":"bcef1011143f","components/forms/Checkbox.jsx":"54ab5454c911","components/forms/IconButton.jsx":"bb4bdb9b7a6e","components/forms/Input.jsx":"32fe37084492","components/forms/Radio.jsx":"9fec23c8b371","components/forms/Select.jsx":"0e6f91e4db29","components/forms/Switch.jsx":"9df4e46106bb","components/forms/Textarea.jsx":"a1c21d7ecd57","components/navigation/Breadcrumb.jsx":"db1d13c4dd8b","components/navigation/Tabs.jsx":"d06ad465fafc","ui_kits/website/FeaturedInsights.jsx":"198224a29326","ui_kits/website/Footer.jsx":"ee5b8f64a957","ui_kits/website/Hero.jsx":"2d3cb44b9b8a","ui_kits/website/ImpactStats.jsx":"c5e29b1b3e0b","ui_kits/website/PartnerStrip.jsx":"ef0759c3b36e","ui_kits/website/SiteHeader.jsx":"20a55bc2a2f8"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.MedtronicLABSDesignSystem_019e1f = window.MedtronicLABSDesignSystem_019e1f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/data-display/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — Avatar
 * Circular user mark with image or initials, optional status dot.
 */
function Avatar({
  src,
  alt,
  name,
  size = "md",
  status,
  style,
  ...rest
}) {
  const sizes = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 72
  };
  const dim = sizes[size] || sizes.md;
  const statusColors = {
    online: "var(--status-success)",
    busy: "var(--ml-merlot)",
    away: "var(--ml-burnt-orange)",
    offline: "var(--text-subtle)"
  };
  const initials = (name || "").split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: "relative",
      display: "inline-flex",
      width: dim,
      height: dim,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: dim,
      height: dim,
      borderRadius: "var(--radius-pill)",
      overflow: "hidden",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--surface-brand-soft)",
      color: "var(--ml-blue)",
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--fw-semibold)",
      fontSize: dim * 0.38
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt || name || "",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initials), status ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: 0,
      bottom: 0,
      width: dim * 0.28,
      height: dim * 0.28,
      minWidth: 8,
      minHeight: 8,
      borderRadius: "var(--radius-pill)",
      background: statusColors[status] || statusColors.offline,
      border: "2px solid var(--ml-white)"
    }
  }) : null);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data-display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — Card
 * Soft-cornered surface. Elevated (shadow) or outlined; optional hover lift.
 */
function Card({
  children,
  variant = "elevated",
  interactive = false,
  padding = 24,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const base = {
    elevated: {
      background: "var(--surface-card)",
      border: "1px solid transparent",
      shadow: "var(--shadow-sm)"
    },
    outlined: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      shadow: "none"
    },
    soft: {
      background: "var(--surface-brand-soft)",
      border: "1px solid transparent",
      shadow: "none"
    }
  };
  const v = base[variant] || base.elevated;
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: v.background,
      border: v.border,
      borderRadius: "var(--radius-xl)",
      padding,
      boxShadow: interactive && hover ? "var(--shadow-md)" : v.shadow,
      transform: interactive && hover ? "translateY(-2px)" : "none",
      transition: "box-shadow var(--duration-base) var(--ease-standard), transform var(--duration-base) var(--ease-standard)",
      cursor: interactive ? "pointer" : "default",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/Card.jsx", error: String((e && e.message) || e) }); }

// components/data-display/StatCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — StatCard
 * Impact / metric card: large figure, label, optional trend delta, and an
 * optional brand triangle accent. Built for the "measurable outcomes" stories.
 */
function StatCard({
  value,
  label,
  sublabel,
  delta,
  deltaDirection = "up",
  accent = "blue",
  style,
  ...rest
}) {
  const accents = {
    blue: "var(--ml-blue)",
    periwinkle: "var(--ml-periwinkle)",
    seafoam: "var(--status-success)",
    terracotta: "var(--ml-burnt-orange)",
    merlot: "var(--ml-merlot)"
  };
  const a = accents[accent] || accents.blue;
  const up = deltaDirection === "up";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: "relative",
      overflow: "hidden",
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-xl)",
      padding: 24,
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: "absolute",
      top: -18,
      right: -10,
      width: 0,
      height: 0,
      borderLeft: "34px solid transparent",
      borderRight: "34px solid transparent",
      borderBottom: `60px solid ${a}`,
      opacity: 0.12,
      transform: "rotate(18deg)"
    }
  }), label ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: "var(--fw-medium)",
      color: "var(--text-muted)",
      marginBottom: 8,
      letterSpacing: "0.01em"
    }
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 40,
      fontWeight: "var(--fw-bold)",
      lineHeight: 1,
      color: "var(--text-strong)",
      letterSpacing: "-0.01em"
    }
  }, value), delta ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 2,
      fontSize: 13,
      fontWeight: "var(--fw-semibold)",
      color: up ? "var(--status-success)" : "var(--ml-merlot)"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      transform: up ? "none" : "rotate(180deg)"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M12 19V5M5 12l7-7 7 7"
  })), delta) : null), sublabel ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--text-muted)",
      marginTop: 8
    }
  }, sublabel) : null);
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data-display/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — Alert
 * Inline message banner across the brand status tones.
 */
function Alert({
  title,
  children,
  variant = "info",
  icon,
  onClose,
  style,
  ...rest
}) {
  const tones = {
    info: {
      bg: "var(--surface-brand-soft)",
      bar: "var(--ml-periwinkle)",
      text: "#2A2B8F"
    },
    success: {
      bg: "var(--ml-peppermint)",
      bar: "var(--status-success)",
      text: "#1B6B47"
    },
    warning: {
      bg: "var(--ml-peach)",
      bar: "var(--ml-burnt-orange)",
      text: "#8A3D14"
    },
    danger: {
      bg: "var(--ml-pink)",
      bar: "var(--ml-merlot)",
      text: "#6B1D1D"
    }
  };
  const t = tones[variant] || tones.info;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "alert",
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
      padding: "14px 16px",
      background: t.bg,
      borderRadius: "var(--radius-lg)",
      borderLeft: `4px solid ${t.bar}`,
      fontFamily: "var(--font-sans)",
      color: t.text,
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      width: 20,
      height: 20,
      flexShrink: 0,
      marginTop: 1,
      color: t.bar
    }
  }, icon) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: "var(--fw-semibold)",
      marginBottom: children ? 3 : 0
    }
  }, title) : null, children ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      lineHeight: "var(--lh-base)",
      opacity: 0.92
    }
  }, children) : null), onClose ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Dismiss",
    onClick: onClose,
    style: {
      display: "inline-flex",
      border: "none",
      background: "transparent",
      padding: 0,
      cursor: "pointer",
      color: t.text,
      opacity: 0.7
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))) : null);
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — Badge
 * Compact status label. Soft (tinted) or solid fills across brand status colors.
 */
function Badge({
  children,
  variant = "neutral",
  solid = false,
  dot = false,
  size = "md",
  style,
  ...rest
}) {
  const tones = {
    neutral: {
      soft: "var(--ml-grey)",
      softText: "var(--ml-ink-800)",
      solid: "var(--ml-ink-800)"
    },
    brand: {
      soft: "var(--surface-brand-soft)",
      softText: "var(--ml-blue)",
      solid: "var(--ml-blue)"
    },
    info: {
      soft: "var(--status-info-soft)",
      softText: "#2A2B8F",
      solid: "var(--ml-periwinkle)"
    },
    success: {
      soft: "var(--ml-peppermint)",
      softText: "#1B6B47",
      solid: "var(--status-success)"
    },
    warning: {
      soft: "var(--ml-peach)",
      softText: "#8A3D14",
      solid: "var(--ml-burnt-orange)"
    },
    danger: {
      soft: "var(--ml-pink)",
      softText: "#6B1D1D",
      solid: "var(--ml-merlot)"
    }
  };
  const t = tones[variant] || tones.neutral;
  const sizes = {
    sm: {
      fs: 11,
      pad: "3px 8px",
      dot: 6
    },
    md: {
      fs: 12,
      pad: "4px 10px",
      dot: 7
    }
  };
  const s = sizes[size] || sizes.md;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-sans)",
      fontSize: s.fs,
      fontWeight: "var(--fw-medium)",
      lineHeight: 1.2,
      letterSpacing: "0.01em",
      padding: s.pad,
      borderRadius: "var(--radius-pill)",
      color: solid ? "var(--ml-white)" : t.softText,
      background: solid ? t.solid : t.soft,
      ...style
    }
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: s.dot,
      height: s.dot,
      borderRadius: "var(--radius-pill)",
      background: solid ? "var(--ml-white)" : t.solid
    }
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Badge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — ProgressBar
 * Linear progress / completion indicator.
 */
function ProgressBar({
  value = 0,
  max = 100,
  variant = "brand",
  size = "md",
  showLabel = false,
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  const colors = {
    brand: "var(--ml-blue)",
    success: "var(--status-success)",
    warning: "var(--ml-burnt-orange)",
    danger: "var(--ml-merlot)"
  };
  const heights = {
    sm: 6,
    md: 8,
    lg: 12
  };
  const h = heights[size] || heights.md;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: h,
      background: "var(--ml-grey)",
      borderRadius: "var(--radius-pill)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct}%`,
      height: "100%",
      background: colors[variant] || colors.brand,
      borderRadius: "var(--radius-pill)",
      transition: "width var(--duration-slow) var(--ease-out)"
    }
  })), showLabel ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: "var(--fw-medium)",
      color: "var(--text-muted)",
      minWidth: 36,
      textAlign: "right"
    }
  }, Math.round(pct), "%") : null);
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — Tag / Chip
 * Filter or selection chip, optionally removable or selectable.
 */
function Tag({
  children,
  selected = false,
  removable = false,
  onRemove,
  onClick,
  leftIcon,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("span", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      fontWeight: "var(--fw-medium)",
      lineHeight: 1.2,
      padding: "6px 12px",
      borderRadius: "var(--radius-pill)",
      cursor: onClick ? "pointer" : "default",
      color: selected ? "var(--ml-blue)" : "var(--ml-ink-800)",
      background: selected ? "var(--surface-brand-soft)" : hover && onClick ? "var(--ml-grey)" : "var(--surface-sunken)",
      border: `1.5px solid ${selected ? "var(--ml-blue)" : "var(--border-default)"}`,
      transition: "background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)",
      ...style
    }
  }, rest), leftIcon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      width: 16,
      height: 16
    }
  }, leftIcon) : null, children, removable ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Remove",
    onClick: e => {
      e.stopPropagation();
      onRemove && onRemove(e);
    },
    style: {
      display: "inline-flex",
      border: "none",
      background: "transparent",
      padding: 0,
      marginLeft: 2,
      cursor: "pointer",
      color: "inherit",
      opacity: 0.7
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))) : null);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
/**
 * Medtronic LABS — Tooltip
 * Hover/focus label on dark indigo. Wrap any trigger element.
 */
function Tooltip({
  children,
  content,
  placement = "top",
  style
}) {
  const [open, setOpen] = React.useState(false);
  const pos = {
    top: {
      bottom: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    bottom: {
      top: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    left: {
      right: "calc(100% + 8px)",
      top: "50%",
      transform: "translateY(-50%)"
    },
    right: {
      left: "calc(100% + 8px)",
      top: "50%",
      transform: "translateY(-50%)"
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      ...style
    },
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false)
  }, children, open ? /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: "absolute",
      zIndex: 50,
      ...pos[placement],
      whiteSpace: "nowrap",
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      fontWeight: "var(--fw-medium)",
      color: "var(--ml-white)",
      background: "var(--ml-ink-900)",
      padding: "6px 10px",
      borderRadius: "var(--radius-sm)",
      boxShadow: "var(--shadow-md)",
      pointerEvents: "none"
    }
  }, content) : null);
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — Button
 * Pill-shaped action control. Indigo primary by default, matching the brand's
 * "CONTACT US" CTA. Medium weight, soft press + hover states.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  shape = "pill",
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled = false,
  type = "button",
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: {
      fontSize: 13,
      padding: "8px 16px",
      gap: 6,
      icon: 16
    },
    md: {
      fontSize: 14,
      padding: "11px 24px",
      gap: 8,
      icon: 18
    },
    lg: {
      fontSize: 16,
      padding: "15px 32px",
      gap: 8,
      icon: 20
    }
  };
  const s = sizes[size] || sizes.md;
  const palettes = {
    primary: {
      background: "var(--ml-blue)",
      color: "var(--ml-white)",
      border: "1.5px solid transparent",
      hoverBg: "var(--ml-brand-hover)"
    },
    secondary: {
      background: "transparent",
      color: "var(--ml-blue)",
      border: "1.5px solid var(--ml-blue)",
      hoverBg: "var(--surface-brand-soft)"
    },
    ghost: {
      background: "transparent",
      color: "var(--ml-blue)",
      border: "1.5px solid transparent",
      hoverBg: "var(--surface-brand-soft)"
    },
    soft: {
      background: "var(--surface-brand-soft)",
      color: "var(--ml-blue)",
      border: "1.5px solid transparent",
      hoverBg: "var(--ml-blue-30)"
    },
    danger: {
      background: "var(--ml-merlot)",
      color: "var(--ml-white)",
      border: "1.5px solid transparent",
      hoverBg: "var(--ml-maroon)"
    }
  };
  const p = palettes[variant] || palettes.primary;
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: {
      display: fullWidth ? "flex" : "inline-flex",
      width: fullWidth ? "100%" : "auto",
      alignItems: "center",
      justifyContent: "center",
      gap: s.gap,
      fontFamily: "var(--font-sans)",
      fontSize: s.fontSize,
      fontWeight: "var(--fw-medium)",
      letterSpacing: "0.01em",
      lineHeight: 1,
      padding: s.padding,
      color: p.color,
      background: hover && !disabled ? p.hoverBg : p.background,
      border: p.border,
      borderRadius: shape === "pill" ? "var(--radius-pill)" : "var(--radius-md)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transform: active && !disabled ? "scale(0.97)" : "scale(1)",
      transition: "background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), leftIcon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      width: s.icon,
      height: s.icon
    }
  }, leftIcon) : null, children, rightIcon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      width: s.icon,
      height: s.icon
    }
  }, rightIcon) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — Checkbox
 * Square check control with brand indigo fill when selected.
 */
function Checkbox({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const inputId = id || `ml-check-${Math.random().toString(36).slice(2, 8)}`;
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const on = isControlled ? checked : internal;
  const toggle = e => {
    if (disabled) return;
    if (!isControlled) setInternal(e.target.checked);
    onChange && onChange(e);
  };
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      color: "var(--text-body)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: "checkbox",
    checked: isControlled ? checked : undefined,
    defaultChecked: isControlled ? undefined : defaultChecked,
    onChange: toggle,
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      width: 1,
      height: 1
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 20,
      height: 20,
      flexShrink: 0,
      borderRadius: "var(--radius-sm)",
      border: on ? "1.5px solid var(--ml-blue)" : "1.5px solid var(--border-default)",
      background: on ? "var(--ml-blue)" : "var(--ml-white)",
      transition: "background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)"
    }
  }, on ? /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--ml-white)",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  })) : null), label ? /*#__PURE__*/React.createElement("span", null, label) : null);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — IconButton
 * Square/circular control holding a single 24px line icon.
 */
function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  shape = "circle",
  disabled = false,
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 48
  };
  const dim = sizes[size] || sizes.md;
  const palettes = {
    primary: {
      background: "var(--ml-blue)",
      color: "var(--ml-white)",
      border: "transparent",
      hoverBg: "var(--ml-brand-hover)"
    },
    secondary: {
      background: "transparent",
      color: "var(--ml-blue)",
      border: "var(--ml-blue)",
      hoverBg: "var(--surface-brand-soft)"
    },
    ghost: {
      background: "transparent",
      color: "var(--ml-ink-800)",
      border: "transparent",
      hoverBg: "var(--surface-brand-soft)"
    }
  };
  const p = palettes[variant] || palettes.ghost;
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: dim,
      height: dim,
      color: p.color,
      background: hover && !disabled ? p.hoverBg : p.background,
      border: `1.5px solid ${p.border}`,
      borderRadius: shape === "circle" ? "var(--radius-pill)" : "var(--radius-md)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transition: "background var(--duration-fast) var(--ease-standard)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      width: dim * 0.5,
      height: dim * 0.5
    }
  }, icon));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — Input
 * Text field with optional label, helper / error text, and leading icon.
 */
function Input({
  label,
  id,
  type = "text",
  placeholder,
  value,
  defaultValue,
  onChange,
  leftIcon,
  helperText,
  error,
  disabled = false,
  required = false,
  style,
  ...rest
}) {
  const inputId = id || `ml-input-${Math.random().toString(36).slice(2, 8)}`;
  const [focus, setFocus] = React.useState(false);
  const borderColor = error ? "var(--ml-merlot)" : focus ? "var(--ml-blue)" : "var(--border-default)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontSize: 13,
      fontWeight: "var(--fw-medium)",
      color: "var(--text-strong)"
    }
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ml-merlot)",
      marginLeft: 3
    }
  }, "*") : null) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 14px",
      background: disabled ? "var(--surface-sunken)" : "var(--ml-white)",
      border: `1.5px solid ${borderColor}`,
      borderRadius: "var(--radius-md)",
      boxShadow: focus && !error ? "var(--shadow-focus)" : "none",
      transition: "border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)",
      opacity: disabled ? 0.6 : 1
    }
  }, leftIcon ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      width: 18,
      height: 18,
      color: "var(--text-muted)"
    }
  }, leftIcon) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    placeholder: placeholder,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    disabled: disabled,
    required: required,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      color: "var(--text-body)",
      padding: "11px 0",
      minWidth: 0
    }
  }, rest))), error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--ml-merlot)"
    }
  }, error) : helperText ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, helperText) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — Radio
 * Single-select circular control. Use inside a RadioGroup or with shared `name`.
 */
function Radio({
  label,
  checked,
  defaultChecked,
  onChange,
  name,
  value,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const inputId = id || `ml-radio-${Math.random().toString(36).slice(2, 8)}`;
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const on = isControlled ? checked : internal;
  const toggle = e => {
    if (disabled) return;
    if (!isControlled) setInternal(e.target.checked);
    onChange && onChange(e);
  };
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      color: "var(--text-body)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: "radio",
    name: name,
    value: value,
    checked: isControlled ? checked : undefined,
    defaultChecked: isControlled ? undefined : defaultChecked,
    onChange: toggle,
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      width: 1,
      height: 1
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 20,
      height: 20,
      flexShrink: 0,
      borderRadius: "var(--radius-pill)",
      border: on ? "1.5px solid var(--ml-blue)" : "1.5px solid var(--border-default)",
      background: "var(--ml-white)",
      transition: "border-color var(--duration-fast) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: "var(--radius-pill)",
      background: "var(--ml-blue)",
      transform: on ? "scale(1)" : "scale(0)",
      transition: "transform var(--duration-fast) var(--ease-out)"
    }
  })), label ? /*#__PURE__*/React.createElement("span", null, label) : null);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — Select
 * Native dropdown styled to match the brand input.
 */
function Select({
  label,
  id,
  options = [],
  value,
  defaultValue,
  onChange,
  placeholder,
  helperText,
  error,
  disabled = false,
  required = false,
  style,
  ...rest
}) {
  const inputId = id || `ml-select-${Math.random().toString(36).slice(2, 8)}`;
  const [focus, setFocus] = React.useState(false);
  const borderColor = error ? "var(--ml-merlot)" : focus ? "var(--ml-blue)" : "var(--border-default)";
  const norm = options.map(o => typeof o === "string" ? {
    value: o,
    label: o
  } : o);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontSize: 13,
      fontWeight: "var(--fw-medium)",
      color: "var(--text-strong)"
    }
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ml-merlot)",
      marginLeft: 3
    }
  }, "*") : null) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      background: disabled ? "var(--surface-sunken)" : "var(--ml-white)",
      border: `1.5px solid ${borderColor}`,
      borderRadius: "var(--radius-md)",
      boxShadow: focus && !error ? "var(--shadow-focus)" : "none",
      transition: "border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)",
      opacity: disabled ? 0.6 : 1
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: inputId,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    disabled: disabled,
    required: required,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      appearance: "none",
      WebkitAppearance: "none",
      flex: 1,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      color: "var(--text-body)",
      padding: "11px 40px 11px 14px",
      cursor: disabled ? "not-allowed" : "pointer"
    }
  }, rest), placeholder ? /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder) : null, norm.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--text-muted)",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      position: "absolute",
      right: 12,
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  }))), error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--ml-merlot)"
    }
  }, error) : helperText ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, helperText) : null);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — Switch
 * On/off toggle. Indigo track when on.
 */
function Switch({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  size = "md",
  id,
  style,
  ...rest
}) {
  const inputId = id || `ml-switch-${Math.random().toString(36).slice(2, 8)}`;
  const isControlled = checked !== undefined;
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const on = isControlled ? checked : internal;
  const dims = {
    sm: {
      w: 36,
      h: 20,
      k: 14
    },
    md: {
      w: 44,
      h: 24,
      k: 18
    }
  };
  const d = dims[size] || dims.md;
  const toggle = e => {
    if (disabled) return;
    if (!isControlled) setInternal(e.target.checked);
    onChange && onChange(e);
  };
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      color: "var(--text-body)",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: "checkbox",
    role: "switch",
    checked: isControlled ? checked : undefined,
    defaultChecked: isControlled ? undefined : defaultChecked,
    onChange: toggle,
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      width: 1,
      height: 1
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: "relative",
      width: d.w,
      height: d.h,
      flexShrink: 0,
      borderRadius: "var(--radius-pill)",
      background: on ? "var(--ml-blue)" : "var(--border-default)",
      transition: "background var(--duration-base) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: (d.h - d.k) / 2,
      left: on ? d.w - d.k - (d.h - d.k) / 2 : (d.h - d.k) / 2,
      width: d.k,
      height: d.k,
      borderRadius: "var(--radius-pill)",
      background: "var(--ml-white)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      transition: "left var(--duration-base) var(--ease-out)"
    }
  })), label ? /*#__PURE__*/React.createElement("span", null, label) : null);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — Textarea
 * Multi-line text field with label + helper / error text.
 */
function Textarea({
  label,
  id,
  placeholder,
  value,
  defaultValue,
  onChange,
  rows = 4,
  helperText,
  error,
  disabled = false,
  required = false,
  style,
  ...rest
}) {
  const inputId = id || `ml-textarea-${Math.random().toString(36).slice(2, 8)}`;
  const [focus, setFocus] = React.useState(false);
  const borderColor = error ? "var(--ml-merlot)" : focus ? "var(--ml-blue)" : "var(--border-default)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontSize: 13,
      fontWeight: "var(--fw-medium)",
      color: "var(--text-strong)"
    }
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ml-merlot)",
      marginLeft: 3
    }
  }, "*") : null) : null, /*#__PURE__*/React.createElement("textarea", _extends({
    id: inputId,
    rows: rows,
    placeholder: placeholder,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    disabled: disabled,
    required: required,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      resize: "vertical",
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      lineHeight: "var(--lh-base)",
      color: "var(--text-body)",
      background: disabled ? "var(--surface-sunken)" : "var(--ml-white)",
      border: `1.5px solid ${borderColor}`,
      borderRadius: "var(--radius-md)",
      padding: "11px 14px",
      outline: "none",
      boxShadow: focus && !error ? "var(--shadow-focus)" : "none",
      transition: "border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)",
      opacity: disabled ? 0.6 : 1
    }
  }, rest)), error ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--ml-merlot)"
    }
  }, error) : helperText ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--text-muted)"
    }
  }, helperText) : null);
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Breadcrumb.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — Breadcrumb
 * Path navigation with chevron separators. The current (last) item is muted.
 */
function Breadcrumb({
  items = [],
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    "aria-label": "Breadcrumb",
    style: {
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("ol", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 6,
      listStyle: "none",
      margin: 0,
      padding: 0
    }
  }, items.map((it, i) => {
    const last = i === items.length - 1;
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6
      }
    }, last ? /*#__PURE__*/React.createElement("span", {
      "aria-current": "page",
      style: {
        fontSize: 13,
        fontWeight: "var(--fw-medium)",
        color: "var(--text-muted)"
      }
    }, it.label) : /*#__PURE__*/React.createElement("a", {
      href: it.href || "#",
      onClick: it.onClick,
      style: {
        fontSize: 13,
        fontWeight: "var(--fw-medium)",
        color: "var(--ml-blue)",
        textDecoration: "none"
      }
    }, it.label), !last ? /*#__PURE__*/React.createElement("svg", {
      width: "14",
      height: "14",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "var(--text-subtle)",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("path", {
      d: "m9 18 6-6-6-6"
    })) : null);
  })));
}
Object.assign(__ds_scope, { Breadcrumb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Breadcrumb.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Medtronic LABS — Tabs
 * Underline tab bar. Controlled (value/onChange) or uncontrolled (defaultValue).
 */
function Tabs({
  items = [],
  value,
  defaultValue,
  onChange,
  style,
  ...rest
}) {
  const isControlled = value !== undefined;
  const first = items[0] && (items[0].id ?? items[0].value);
  const [internal, setInternal] = React.useState(defaultValue ?? first);
  const active = isControlled ? value : internal;
  const select = id => {
    if (!isControlled) setInternal(id);
    onChange && onChange(id);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: "flex",
      gap: 4,
      borderBottom: "1.5px solid var(--border-subtle)",
      fontFamily: "var(--font-sans)",
      ...style
    }
  }, rest), items.map(it => {
    const id = it.id ?? it.value;
    const on = id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      role: "tab",
      "aria-selected": on,
      onClick: () => select(id),
      style: {
        position: "relative",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: "12px 16px",
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        fontWeight: on ? "var(--fw-semibold)" : "var(--fw-medium)",
        color: on ? "var(--ml-blue)" : "var(--text-muted)",
        transition: "color var(--duration-fast) var(--ease-standard)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8
      }
    }, it.icon ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: "inline-flex",
        width: 18,
        height: 18
      }
    }, it.icon) : null, it.label, it.count !== undefined ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: "var(--fw-semibold)",
        color: on ? "var(--ml-blue)" : "var(--text-subtle)",
        background: on ? "var(--surface-brand-soft)" : "var(--surface-sunken)",
        borderRadius: "var(--radius-pill)",
        padding: "1px 8px"
      }
    }, it.count) : null), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: -1.5,
        height: 2.5,
        borderRadius: "var(--radius-pill)",
        background: on ? "var(--ml-blue)" : "transparent",
        transition: "background var(--duration-fast) var(--ease-standard)"
      }
    }));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/FeaturedInsights.jsx
try { (() => {
// Medtronic LABS — Featured Insights with category filter
function FeaturedInsights() {
  const {
    Card,
    Tabs
  } = window.MedtronicLABSDesignSystem_019e1f;
  const posts = [{
    cat: "Kenya",
    title: "Why community health in Kenya must go digital",
    img: "../../assets/photo-chw-child.jpeg"
  }, {
    cat: "Global",
    title: "What we learned from going virtual",
    img: "../../assets/photo-hands.jpeg"
  }, {
    cat: "Philippines",
    title: "Partnering with reach52 on diabetes & hypertension",
    img: "../../assets/illo-climbing-sm.jpeg"
  }, {
    cat: "Global",
    title: "Designing care around the patient, not the clinic",
    img: "../../assets/photo-chw-child-treated.jpeg"
  }, {
    cat: "Kenya",
    title: "Training the next 1,000 community health workers",
    img: "../../assets/photo-hands-treated.jpeg"
  }, {
    cat: "Philippines",
    title: "Bringing screening to the last mile",
    img: "../../assets/illo-consultation.png"
  }];
  const cats = ["All", "Kenya", "Philippines", "Global"];
  const [active, setActive] = React.useState("All");
  const shown = posts.filter(p => active === "All" || p.cat === active).slice(0, 3);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "#fff",
      padding: "64px 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 34,
      fontWeight: 500,
      color: "var(--text-strong)"
    }
  }, "Featured insights"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--ml-blue)"
    }
  }, "See all \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 460,
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    value: active,
    onChange: setActive,
    items: cats.map(c => ({
      id: c,
      label: c
    }))
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 24
    }
  }, shown.map(p => /*#__PURE__*/React.createElement(Card, {
    key: p.title,
    variant: "outlined",
    padding: 0,
    interactive: true,
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 180
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: p.img,
    alt: "",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--ml-gradient-duotone)",
      mixBlendMode: "multiply"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ml-eyebrow"
  }, p.cat), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      color: "var(--text-strong)",
      marginTop: 8,
      lineHeight: 1.3
    }
  }, p.title)))))));
}
Object.assign(window, {
  FeaturedInsights
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/FeaturedInsights.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Footer.jsx
try { (() => {
// Medtronic LABS — newsletter CTA + footer
function Newsletter() {
  const {
    Input,
    Button,
    Alert
  } = window.MedtronicLABSDesignSystem_019e1f;
  const [done, setDone] = React.useState(false);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-brand-soft)",
      padding: "64px 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 720,
      margin: "0 auto",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ml-eyebrow"
  }, "Stay in touch"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 30,
      fontWeight: 500,
      color: "var(--text-strong)",
      margin: "10px 0 8px"
    }
  }, "A bold approach to last-mile healthcare delivery"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      color: "var(--text-muted)",
      marginBottom: 24
    }
  }, "Get our latest insights from the field, a few times a year."), done ? /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 440,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(Alert, {
    variant: "success",
    title: "You're subscribed"
  }, "We'll be in touch with stories that matter.")) : /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      setDone(true);
    },
    style: {
      display: "flex",
      gap: 10,
      maxWidth: 460,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "you@organisation.org",
    type: "email",
    required: true
  })), /*#__PURE__*/React.createElement(Button, {
    type: "submit",
    size: "lg"
  }, "Subscribe"))));
}
function SiteFooter() {
  const cols = {
    Approach: ["Digital technology", "Field operations", "Partnerships"],
    Programs: ["Hypertension", "Diabetes", "Maternal health"],
    Company: ["About", "Insights", "Careers", "Contact"]
  };
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "#140C8C",
      color: "rgba(255,255,255,0.8)",
      padding: "56px 40px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1.4fr repeat(3, 1fr)",
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: "0.3em",
      fontSize: 19,
      color: "#fff",
      lineHeight: 1,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      letterSpacing: "0.16em"
    }
  }, "MEDTRONIC"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      letterSpacing: "0.04em"
    }
  }, "LABS")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      lineHeight: 1.5,
      maxWidth: 260
    }
  }, "Designing the health system of the future by fostering local collaboration to address global challenges.")), Object.entries(cols).map(([h, items]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#fff",
      marginBottom: 12,
      letterSpacing: "0.04em"
    }
  }, h), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, items.map(i => /*#__PURE__*/React.createElement("li", {
    key: i
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontSize: 13,
      color: "rgba(255,255,255,0.75)",
      textDecoration: "none"
    }
  }, i))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "28px auto 0",
      paddingTop: 20,
      borderTop: "1px solid rgba(255,255,255,0.15)",
      fontSize: 12,
      opacity: 0.7
    }
  }, "\xA9 2026 Medtronic LABS. All rights reserved."));
}
Object.assign(window, {
  Newsletter,
  SiteFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Hero.jsx
try { (() => {
// Medtronic LABS — hero
function Hero({
  onContact
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: "var(--ml-blue)",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/pattern-lines.png",
    alt: "",
    style: {
      position: "absolute",
      right: -40,
      top: -40,
      width: 420,
      opacity: 0.18,
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.1fr 0.9fr",
      gap: 32,
      alignItems: "center",
      maxWidth: 1200,
      margin: "0 auto",
      padding: "72px 40px 80px"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--ml-blue-30)",
      marginBottom: 18
    }
  }, "Community-based population health"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 52,
      fontWeight: 500,
      lineHeight: 1.08,
      letterSpacing: "-0.015em",
      margin: 0,
      color: "#fff",
      textWrap: "balance"
    }
  }, "We're transforming health systems with ", /*#__PURE__*/React.createElement("b", {
    style: {
      fontWeight: 700
    }
  }, "care you can measure")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 18,
      lineHeight: 1.5,
      color: "rgba(255,255,255,0.85)",
      marginTop: 20,
      maxWidth: 520
    }
  }, "A bold approach to last-mile healthcare delivery \u2014 integrating digital technology, field operations and partnerships to promote human flourishing."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "soft",
    size: "lg",
    onClick: onContact
  }, "Get in touch"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "lg",
    style: {
      color: "#fff",
      border: "1.5px solid rgba(255,255,255,0.5)"
    }
  }, "See our impact"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/illo-consultation.png",
    alt: "Community health worker consulting with patients",
    style: {
      width: "100%",
      maxWidth: 420
    }
  }))));
}
Object.assign(window, {
  Hero
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ImpactStats.jsx
try { (() => {
// Medtronic LABS — impact stats band
function ImpactStats() {
  const {
    StatCard
  } = window.MedtronicLABSDesignSystem_019e1f;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-page)",
      padding: "56px 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 32
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ml-eyebrow"
  }, "Community impact"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 32,
      fontWeight: 500,
      color: "var(--text-strong)",
      marginTop: 8
    }
  }, "Measurable outcomes, at scale")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    label: "Patients reached",
    value: "6.2M",
    delta: "+18%",
    accent: "blue"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Active health workers",
    value: "3,400",
    sublabel: "across 4 countries",
    accent: "terracotta"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Hypertension controlled",
    value: "68%",
    delta: "+4%",
    accent: "seafoam"
  }), /*#__PURE__*/React.createElement(StatCard, {
    label: "Cost per patient",
    value: "\u221231%",
    sublabel: "vs standard of care",
    accent: "periwinkle"
  }))));
}
Object.assign(window, {
  ImpactStats
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ImpactStats.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/PartnerStrip.jsx
try { (() => {
// Medtronic LABS — partner strip
function PartnerStrip() {
  const partners = ["Medtronic", "reach52", "PATH", "Novartis Foundation", "AMPATH", "Gates Foundation"];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--ml-blue)",
      color: "#fff",
      padding: "56px 40px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 20,
      fontWeight: 500,
      lineHeight: 1.45,
      maxWidth: 720,
      margin: "0 auto 36px"
    }
  }, "Partnerships are in our DNA. We are proud to work with partners at every level \u2014 from patients to policy-makers \u2014 to improve health above all else."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "36px 56px",
      alignItems: "center",
      opacity: 0.92
    }
  }, partners.map(p => /*#__PURE__*/React.createElement("span", {
    key: p,
    style: {
      fontSize: 19,
      fontWeight: 600,
      letterSpacing: "0.01em",
      color: "rgba(255,255,255,0.88)"
    }
  }, p))));
}
Object.assign(window, {
  PartnerStrip
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/PartnerStrip.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/SiteHeader.jsx
try { (() => {
// Medtronic LABS — site header / nav
function SiteHeader({
  onContact
}) {
  const links = ["Approach", "Programs", "Insights", "About"];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 30,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 40px",
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(8px)",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-mark.png",
    alt: "",
    style: {
      height: 30
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: "0.3em",
      fontSize: 19,
      color: "var(--ml-blue)",
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      letterSpacing: "0.16em"
    }
  }, "MEDTRONIC"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      letterSpacing: "0.04em"
    }
  }, "LABS"))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 28
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: "var(--text-body)",
      textDecoration: "none"
    }
  }, l)), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: onContact
  }, "Get in touch")));
}
Object.assign(window, {
  SiteHeader
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/SiteHeader.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Breadcrumb = __ds_scope.Breadcrumb;

__ds_ns.Tabs = __ds_scope.Tabs;

})();

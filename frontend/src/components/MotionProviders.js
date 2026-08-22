"use client";

import { LayoutGroup, MotionConfig } from "framer-motion";

export default function MotionProviders({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="finsight-layout">{children}</LayoutGroup>
    </MotionConfig>
  );
}
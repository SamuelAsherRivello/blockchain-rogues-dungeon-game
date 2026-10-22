import { useEffect, useState } from "react";
import { classifyPlatform } from "./layout.ts";

function isMobileBrowser() {
  return classifyPlatform({
    userAgentDataMobile: navigator.userAgentData?.mobile,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  }) === "mobile";
}

export function useMobileBrowser() {
  const [mobile, setMobile] = useState(isMobileBrowser);
  useEffect(() => {
    const pointer = window.matchMedia("(pointer: coarse)");
    const update = () => setMobile(isMobileBrowser());
    window.addEventListener("resize", update);
    pointer.addEventListener("change", update);
    update();
    return () => {
      window.removeEventListener("resize", update);
      pointer.removeEventListener("change", update);
    };
  }, []);
  return mobile;
}

import React from "react";
import Link from "next/link";

const Header = () => (
  <div className="header">
    <Link href="/">
      <a>Settings</a>
    </Link>
    <Link href="/about">
      <a>Documentation</a>
    </Link>
  </div>
);

export default Header;

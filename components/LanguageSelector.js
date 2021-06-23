// import React, {useCallback, useState} from "react";
// import {Select} from "@shopify/polaris";
// import {useTranslation} from "next-i18next";
// import Link from "next/link";
// import {useRouter} from "next/router";
// import Image from "next/image";

// const LanguageSelector = ({shopOrigin}) => {
//   const {t} = useTranslation("common");
//   const router = useRouter();
//   const [selected, setSelected] = useState(router.locale);

//   const handleSelectChange = useCallback((lang) => {
//     i18n.changeLanguage(lang);
//     setSelected(lang);
//   }, []);

//   const options = [
//     {label: "english", value: "en"},
//     {label: "polski", value: "pl"},
//   ];

//   return (
//     <div id="languageselector">
//       {/* <Select
//         label={t("change-locale")}
//         options={options}
//         onChange={() => (
//           <Link href="/" locale={router.locale === "en" ? "pl" : "en"} />
//         )}
//         value={selected}
//         labelHidden={true}
//       /> */}
//       <Link
//         href={`/?shop=${shopOrigin}`}
//         locale={router.locale === "en" ? "pl" : "en"}
//       >
//         <button>{t("change-locale")}</button>
//       </Link>
//     </div>
//   );
// };

// export default LanguageSelector;

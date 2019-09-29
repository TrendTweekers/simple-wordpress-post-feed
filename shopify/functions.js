/**
 *  Fetch Wordpress Rest API
 */
const wps = async () => {
  // Queryselector for Data attributes
  const selector = document.querySelector("#wp-feed");

  // Assign attribute values
  const url = selector.getAttribute("data-url");
  const posts = `&per_page=${selector.getAttribute("data-posts")}`;
  // const category = selector.getAttribute("data-category");
  // const author = selector.getAttribute("data-author");

  // Make full rest Api string
  const restApi = `${url}/wp-json/wp/v2/posts?order=asc${posts}`;

  // Fetch
  const response = await fetch(restApi);
  const data = await response.json();
  console.log("HERE COMES DATA");
  console.log(data);

  document.addEventListener("shopify:section:load", function(event) {
    if (event.detail.sectionId === "product-recommendations") {
      console.log("PARTEY");
      wps();
    }
  });
};
wps();

//
// Display placeholder
// @param {number} posts The number of posts
// @returns {*} display the posts
//
let target;
const wpsDisplayPlaceholder = (posts) => {
  let preload = "";

  for (let item = 0; item < posts; item += 1) {
    preload += `<figure class="swpf-box swpf-skeleton">
   </figure>`;
  }

  document.getElementById("wpsContent").innerHTML = preload;
};

/**
 * Function we call everytime we need to refresh data
 * Calls Wordpress Rest API and builds object
 */

const wpsFetch = async () => {
    // Global vars

    // Get values from data attributes
  const selector = document.querySelector("#swpf-feed");
  let url = selector.getAttribute("data-url");
  const posts = selector.getAttribute("data-posts");
  let category = "";
  if (selector.getAttribute("data-category")) {
    category = `&category=${selector.getAttribute("data-category")}`;
  }
  let tags = "";
  if (selector.getAttribute("data-tags")) {
    tags = `&tags=${selector.getAttribute("data-tags")}`;
  }

  let slug = "";
  if (selector.getAttribute("data-slug")) {
    slug = `&slug=${selector.getAttribute("data-slug")}`;
  }
  let tagsExclude = "";
  if (selector.getAttribute("data-tags_exclude")) {
    tagsExclude = `&tags_exclude=${selector.getAttribute("data-tags_exclude")}`;
  }
  const showExcerpt = selector.getAttribute("data-show_excerpt") === "true";
  const clickable = selector.getAttribute("data-excerpt-clickable") === "true";
    // eslint-disable-next-line radix
  const excerptLength = parseInt(selector.getAttribute("data-excerpt_length"));
  const btntext = selector.getAttribute("data-excerpt-btn-text");
  const wpHosted = selector.getAttribute("data-wp") === "true";

  target = selector.getAttribute("data-target") === "true"
        ? ""
        : "_blank";

    // logging stripped out in production by gulp
  console.log(url);
  console.log(posts);
  console.log(category);
  console.log(slug);
  console.log(tags);
  console.log(tagsExclude);
  console.log(wpHosted);
  console.log(`show excerpt ${showExcerpt}`);

    // Display placeholder
  wpsDisplayPlaceholder(posts);

    // Check if self hosted or not and act upon that
    // Build string and fetch
  if (wpHosted) {
    console.log(url);
        // url = url.replace(/(^\w+:|^)\/\//, "");
        // eslint-disable-next-line require-unicode-regexp
    url = url.replace(/\/+$/, "");
    console.log(url);
    const restApi = `https://public-api.wordpress.com/rest/v1.1/sites/${url}/posts/?number=${posts}${category}${tags}${slug}${tagsExclude}`;
    console.log(restApi);
    const response = await fetch(restApi);
    const data = await response.json();
    const swpfData = {
      data,
      wp: wpHosted,
      showExcerpt,
      excerptLength,
      btntext,
      clickable,
    };

    return swpfData;
  }
  console.log("NOT WP HOSTED");
  if (selector.getAttribute("data-category")) {
    category = `&categories=${selector.getAttribute("data-category")}`;
  }
  const isUrl = (inputString) => {
    const regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    if (regexp.test(inputString)) {
      return inputString;
    }

    return `https://${inputString}`;
  };
  const restApi = `${isUrl(url)}/wp-json/wp/v2/posts?_embed&order=desc&per_page=${posts}${category}${tags}${slug}${tagsExclude}`;
  const response = await fetch(restApi);
  const data = await response.json();
  const swpfData = {
    data,
    wp: wpHosted,
    showExcerpt,
    excerptLength,
    btntext,
    clickable,
  };

  return swpfData;
};

/**
 *  Push to frontend
 *  writes out data to to frontend
 */

const truncateString = (str, num) => {
  if (str.length > num) {
    const subStr = str.substring(0, num);

    return `${subStr}...`;
  }

  return str;
};

const wpsDisplay = async () => {
  let output = "";
  const swpfdata = await wpsFetch();
  const {data, wp, showExcerpt, excerptLength, btntext, clickable} = swpfdata;

  console.log(`is it wp hosted ${wp}`);
    // console.log(data);

    // Loop out data

  if (wp) {
    console.log("am a wordpress.com hosted site");
    data.posts.forEach((item) => {
      const post = {image: "dont exist", title: "", link: ""};
      post.title = item.title;
      post.link = item.URL;
      post.image = item.featured_image;
      if (showExcerpt) {
        const excerpt = truncateString(item.excerpt, excerptLength);
        if (clickable) {
          output += `
				<a class= "swpf-box-ex" href="${post.link}" target="${target}" title="${post.title}" >
										
    										<div class="swpf-image-ex"><img loading="lazy" alt="${post.title}" src="${post.image}"></div>
  										
										<div class="swpf-content-ex"><h3 class="swpf_box_title">${post.title}</h3>${excerpt}</div>
						<div class="swpf-link-ex" >${btntext}</div>				
  				</a>`;
        } else {
          output += `
				<div class= "swpf-box-ex" >
										
    										<div class="swpf-image-ex"><img loading="lazy" alt="${post.title}" src="${post.image}"></div>
  										
										<div class="swpf-content-ex"><h3 class="swpf_box_title">${post.title}</h3>${excerpt}</div>
										
						<a class="swpf-link-ex" href="${post.link}" target="${target}" title="${post.title}" >${btntext}</a>

  				</div>`;
        }
      } else {
        output += `<figure class= "swpf-box" > <a href="${post.link}" target="${target}" title="${post.title}">
      <img loading="lazy" alt="${post.title}" src="${post.image}"><div class="swpf-content text-center"><span class="swpf_box_title">${post.title}</span></div></a></figure>`;
      }
      document.getElementById("wpsContent").innerHTML = `<div class="swpf-container-ex">${output}</div>`;
    });
  } else {
    data.forEach((item) => {
      const post = {
        image: "https://picsum.photos/400/400",
        title: "",
        link: "",
      };
      post.title = item.title.rendered;
      post.link = item.link;
      if (item._embedded["wp:featuredmedia"]) {
        console.log("exist");
        if (item._embedded["wp:featuredmedia"][0].media_details) {
          post.image =
                        item._embedded["wp:featuredmedia"][0].media_details.sizes.full.source_url;
        }
      }

      if (showExcerpt) {
        const excerpt = truncateString(item.excerpt.rendered, excerptLength);
        if (clickable) {
          output += `
				<a class= "swpf-box-ex" href="${post.link}" target="${target}" title="${post.title}" >
										
    										<div class="swpf-image-ex"><img loading="lazy" alt="${post.title}" src="${post.image}"></div>
  										
										<div class="swpf-content-ex"><h3 class="swpf_box_title">${post.title}</h3>${excerpt}</div>
						<div class="swpf-link-ex" >${btntext}</div>				
  				</a>`;
        } else {
          output += `
				<div class= "swpf-box-ex" >
										
    										<div class="swpf-image-ex"><img loading="lazy" alt="${post.title}" src="${post.image}"></div>
  										
										<div class="swpf-content-ex"><h3 class="swpf_box_title">${post.title}</h3>${excerpt}</div>
										
						<a class="swpf-link-ex" href="${post.link}" target="${target}" title="${post.title}" >${btntext}</a>

  				</div>`;
        }
      } else {
        output += `<figure class= "swpf-box" > <a href="${post.link}" target="${target}" title="${post.title}">
      <img loading="lazy" alt="${post.title}" src="${post.image}"><div class="swpf-content text-center"><span class="swpf_box_title">${post.title}</span></div></a></figure>`;
      }
      document.getElementById("wpsContent").innerHTML = `<div class="swpf-container-ex">${output}</div>`;
    });
  }
};

/**
 *  Shopify Event listener
 *  listen for changes in settings and trigger update to provide
 *  a good UX in customizer
 */

document.addEventListener("shopify:section:load", (event) => {
  if (event.detail.sectionId) {
    wpsDisplay();
  }
});
document.addEventListener("shopify:section:select", (event) => {
  if (event.detail.sectionId) {
    wpsDisplay();
  }
});

/**
 *  Check so script exist
 */
const wps = document.getElementById("swpf-feed");
// console.log(wps);
if (wps !== null) {
  wpsDisplay();
}

// console.log("scriptTag");

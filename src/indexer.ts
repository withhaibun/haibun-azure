import { TReviewLink } from "@haibun/domain-storage/build/domain-storage.js";

// this will be provided at runtime
const webContext = { webContext: 'tbd', account: 'tbd', destination: 'tbd' };

export async function getLatestPublished(defaultApiUrl: string) {
  const apiUrl = `https://${webContext.account}.blob.core.windows.net/${webContext.destination}?restype=container&comp=list&prefix=/dashboard/reviews`;
  const response = await fetch(apiUrl);
  const data = await response.text();
  const parseLinks = (xml: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');

    const urlNodes = xmlDoc.getElementsByTagName('Url');
    const links = Array.from(urlNodes).map(node => <string>node.textContent);
    return links;
  }
  const latest = parseLinks(data);
  return latest;
}


export async function resolvePublishedReview(link: string): Promise<TReviewLink> {
  const response = await fetch(link);
  const reviewLink: TReviewLink = await response.json();
  reviewLink.link = `/${webContext.destination}/${reviewLink.link}`
  return reviewLink;
}

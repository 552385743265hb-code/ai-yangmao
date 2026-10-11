import type {FetchedPage} from './lib';
import {sha256} from './lib';
import type {SourceFetch} from '../src/shared/identity/fetch-evidence';
export function fetchedSource(page:FetchedPage|undefined):{sourceText?:string;sourceFetch?:SourceFetch}{
 if(!page)return {};const sourceText=page.text.slice(0,250000);
 if(!page.originalUrl||!page.finalUrl||!page.fetchedUrl)return {sourceText};
 return {sourceText,sourceFetch:{originalUrl:page.originalUrl,finalUrl:page.finalUrl,fetchedUrl:page.fetchedUrl,method:page.fetchMethod??page.via,sourceVerified:page.sourceVerified===true,truncated:page.truncated===true||page.text.length>250000,contentHash:sha256(sourceText),originalContentHash:sha256(page.text)}};
}

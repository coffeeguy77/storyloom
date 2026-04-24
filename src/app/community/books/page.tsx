// src/app/community/books/page.tsx
//
// Backwards-compatibility redirect. The old unified library lived here;
// it's now /community with a Books tab.
 
import { redirect } from "next/navigation"
 
export default function CommunityBooksRedirect() {
  redirect("/community")
}
 

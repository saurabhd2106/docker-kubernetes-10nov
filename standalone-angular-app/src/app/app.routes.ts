import { ResolveFn, Routes } from '@angular/router';
import { About } from './pages/about';
import { Home } from './pages/home';
import { NotFound } from './pages/not-found';
import { PostPage } from './pages/post';
import { findPost } from './posts';

const SITE = 'Container Field Notes';

const postTitle: ResolveFn<string> = (route) => {
  const post = findPost(route.paramMap.get('slug'));
  return `${post ? post.title : 'Page not found'} · ${SITE}`;
};

export const routes: Routes = [
  { path: '', component: Home, title: SITE },
  { path: 'about', component: About, title: `About · ${SITE}` },
  { path: 'posts/:slug', component: PostPage, title: postTitle },
  { path: '**', component: NotFound, title: `Page not found · ${SITE}` },
];

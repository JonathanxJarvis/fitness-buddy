import { Redirect } from 'expo-router';

/** The crew moved into its own tab. */
export default function FriendsRedirect() {
  return <Redirect href="/crew" />;
}

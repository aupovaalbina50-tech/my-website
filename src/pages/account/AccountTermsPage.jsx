import TermsHub from '../shared/TermsHub.jsx'

// The same «Терминдер» screen as on the public site; terms open inside the account.
function AccountTermsPage() {
  return <TermsHub termBasePath="/account/terms" />
}

export default AccountTermsPage

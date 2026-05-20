import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { translate } from '../../../../../lib/locale/translate/translate.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request, response, next) => {
  // Check if the user is logged in
  const user = request.getCurrentUser();
  if (user) {
    // Redirect to admin dashboard
    response.redirect(buildUrl('dashboard'));
  } else {
    setPageMetaInfo(request, {
      title: translate('Admin Login'),
      description: translate('Admin Login')
    });
    next();
  }
};

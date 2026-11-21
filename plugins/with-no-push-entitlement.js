/**
 * iPhone のプッシュ通知の権限（aps-environment）を外す。
 *
 * このアプリのお知らせは、スマホの中で予約するもの（ローカル通知）だけで、
 * サーバーから送るプッシュ通知は使わない。expo-notifications が自動で付ける権限を外して、
 * プッシュ通知の入っていない配布用の設定（プロビジョニングプロファイル）でもビルドできるようにする。
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withNoPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });
};

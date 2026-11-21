import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import type { NotificationPermission } from '@/lib/notifications';
import { locationStatusText, notificationStatusText } from '@/lib/use-permissions';
import type { LocationPermission } from '@/location/source';

import { Button } from './button';
import { Icon } from './icon';
import { ThemedText } from './themed-text';

const IS_WEB = Platform.OS === 'web';

/** 位置とお知らせの許可の状態（はじめの画面・設定画面）。直すときは設定アプリを開く */
export function PermissionRows({
  location,
  notification,
  hideBody,
}: {
  location: LocationPermission | null;
  notification: NotificationPermission | null;
  /** 説明の文を出さない（設定画面） */
  hideBody?: boolean;
}) {
  const locStatus = locationStatusText(location);
  const notiStatus = notificationStatusText(notification);
  const needsSettings = !IS_WEB && (location === 'whenInUse' || location === 'denied' || notification === 'denied');
  return (
    <View style={{ gap: Spacing.three }}>
      <Row sf="location" md="location_on" title="位置情報（「常に」）" body={hideBody ? undefined : "画面を閉じている間も、車での移動を記録します。"}>
        {locStatus ? (
          <ThemedText type="bold" color={locStatus.tone}>
            {locStatus.text}
          </ThemedText>
        ) : null}
      </Row>
      <Row sf="bell" md="notifications" title="お知らせ" body={hideBody ? undefined : "結果が出たときと、記録がない日にお知らせします。"}>
        {notiStatus ? (
          <ThemedText type="bold" color={notiStatus.tone}>
            {notiStatus.text}
          </ThemedText>
        ) : null}
      </Row>
      {needsSettings ? (
        <Button label="設定アプリを開く" variant="secondary" onPress={() => void Linking.openSettings()} />
      ) : null}
    </View>
  );
}

function Row({
  sf,
  md,
  title,
  body,
  children,
}: {
  sf: Parameters<typeof Icon>[0]['sf'];
  md: Parameters<typeof Icon>[0]['md'];
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Icon sf={sf} md={md} size={22} color={Colors.navy} />
      </View>
      <View style={styles.text}>
        <ThemedText type="bold">{title}</ThemedText>
        {body ? <ThemedText color="sub">{body}</ThemedText> : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.evTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});

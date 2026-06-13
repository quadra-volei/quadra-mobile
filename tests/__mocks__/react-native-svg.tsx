import React from 'react';
import { View } from 'react-native';

const Svg = ({ children, testID, width, height, ...props }: any) => (
  <View testID={testID ?? 'svg-mock'} width={width} height={height} {...props}>
    {children}
  </View>
);
const Path = (_props: any) => null;
const G = ({ children, ...props }: any) => <View {...props}>{children}</View>;
const Circle = (_props: any) => null;
const Rect = (_props: any) => null;

export default Svg;
export { Path, G, Circle, Rect };

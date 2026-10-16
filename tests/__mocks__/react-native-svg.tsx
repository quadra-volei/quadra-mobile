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
const Line = (_props: any) => null;

// Gradient and clip definitions draw nothing; Defs keeps them out of the tree.
const Defs = (_props: any) => null;
const LinearGradient = (_props: any) => null;
const RadialGradient = (_props: any) => null;
const Stop = (_props: any) => null;
const ClipPath = (_props: any) => null;
const Polygon = (_props: any) => null;
const Image = (_props: any) => null;

export default Svg;
export { Path, G, Circle, Rect, Line, Defs, LinearGradient, RadialGradient, Stop, ClipPath, Polygon, Image };

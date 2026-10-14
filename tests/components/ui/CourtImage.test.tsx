import React from 'react';

// LinearGradient -> View carrying its colors for assertion.
jest.mock('expo-linear-gradient', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: any) => ReactLocal.createElement(View, props),
  };
});
jest.mock('expo-image', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return { Image: (props: any) => ReactLocal.createElement(View, props) };
});

import { render, screen } from '@testing-library/react-native';

import { CourtImage } from '@/components/ui/CourtImage';

describe('CourtImage level filter', () => {
  it('tints a cover photo with the level color fading into navy', async () => {
    await render(<CourtImage tint="#00B4D8" height={100} imageUri="https://cdn.test/c.jpg" />);

    expect(screen.getByTestId('court-image-photo')).toBeTruthy();
    expect(screen.getByTestId('court-image-filter').props.colors).toEqual([
      'rgba(0,180,216,0.55)',
      'rgba(10,10,60,0.6)',
    ]);
  });

  it('shows no filter without a photo (the court is already tinted)', async () => {
    await render(<CourtImage tint="#00B4D8" height={100} />);

    expect(screen.queryByTestId('court-image-photo')).toBeNull();
    expect(screen.queryByTestId('court-image-filter')).toBeNull();
  });
});

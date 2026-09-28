import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import type { FoodCategory } from './foodCategory';

/**
 * Small flat food illustrations drawn on a 48×48 grid. Each category has a tint
 * used for its tile so a diary reads as a row of little pictures rather than a
 * column of letters.
 */
export const CATEGORY_TINT: Record<FoodCategory, string> = {
  egg: '#F2B233',
  bread: '#C98A4B',
  pastry: '#B5652B',
  cereal: '#D9A441',
  rice: '#C9B79A',
  pasta: '#E8B92F',
  potato: '#B98652',
  fries: '#E0483E',
  apple: '#E5483F',
  banana: '#E8C22A',
  berries: '#E23F4B',
  citrus: '#F28C28',
  avocado: '#6E9A36',
  greens: '#3E9B4F',
  salad: '#58A84A',
  carrot: '#EE7E2A',
  tomato: '#E4433A',
  chicken: '#D98A3D',
  meat: '#A5452C',
  sausage: '#B5553A',
  fish: '#3F82D6',
  legume: '#6CB04A',
  milk: '#4C8DF6',
  yogurt: '#8B6CF6',
  cheese: '#F0B429',
  fat: '#A8B43A',
  sauce: '#D9342B',
  coffee: '#8A5A3B',
  juice: '#F59E2B',
  soda: '#D9342B',
  beer: '#E6A92E',
  wine: '#8E2C48',
  water: '#38A7E8',
  nut: '#A86C38',
  chocolate: '#6B3E26',
  sweets: '#E0527E',
  cake: '#E0689A',
  cookie: '#C58B45',
  icecream: '#E57AA5',
  chips: '#E8B530',
  protein: '#7B5CE6',
  pizza: '#E08A2E',
  burger: '#C9772E',
  soup: '#E0782F',
  dish: '#2BA37A',
};

const WHITE = '#FFFFFF';
const EDGE = 'rgba(40,30,20,0.14)';
const LEAF = '#4FA84A';
const LEAF_LIGHT = '#7CC45A';

type Draw = (bg: string) => React.ReactNode;

function Bowl({ color = '#F4F1EA', stroke = EDGE }: { color?: string; stroke?: string }) {
  return <Path d="M8 25h32c0 8.5-7 14.5-16 14.5S8 33.5 8 25z" fill={color} stroke={stroke} strokeWidth={1} />;
}

function Glass({ fill, level = 18 }: { fill: string; level?: number }) {
  return (
    <G>
      <Path d="M14 10h20l-2.6 28.4a2 2 0 0 1-2 1.6H18.6a2 2 0 0 1-2-1.6z" fill="#EAF4FB" fillOpacity={0.9} stroke="#B8CCDA" strokeWidth={1.2} />
      <Path d={`M${14 + (level - 10) * 0.09} ${level}h${20 - (level - 10) * 0.18}l-2.3 20.4a2 2 0 0 1-2 1.6H18.6a2 2 0 0 1-2-1.6z`} fill={fill} />
      <Path d="M18 14l1.6 22" stroke={WHITE} strokeOpacity={0.55} strokeWidth={1.6} strokeLinecap="round" />
    </G>
  );
}

const ART: Record<FoodCategory, Draw> = {
  egg: () => (
    <G>
      <Path d="M9.5 26c-1.6-9 8-15.6 16-14.4 9 1.3 14.5 7.8 12.6 15.8-1.9 8-10.8 11.6-18 9.8C13.5 35.7 10.2 31.5 9.5 26z" fill={WHITE} stroke={EDGE} strokeWidth={1} />
      <Circle cx={24} cy={24.5} r={6.8} fill="#F6B21B" />
      <Circle cx={24} cy={24.5} r={6.8} fill="none" stroke="#E39A0E" strokeWidth={1} />
      <Ellipse cx={21.8} cy={22.3} rx={2.2} ry={1.6} fill="#FFE39A" />
    </G>
  ),
  bread: () => (
    <G>
      <Path d="M12 38V22.5c-4-1.8-3.4-11.5 5.5-11.5h13c8.9 0 9.5 9.7 5.5 11.5V38a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2z" fill="#B97637" />
      <Path d="M15 36.5V21c-2.6-1.4-2-7 3-7h12c5 0 5.6 5.6 3 7v15.5z" fill="#F2D6A2" />
      <Circle cx={20} cy={24} r={1.1} fill="#DDB77A" />
      <Circle cx={27} cy={21} r={0.9} fill="#DDB77A" />
      <Circle cx={25} cy={29} r={1.2} fill="#DDB77A" />
      <Circle cx={19.5} cy={32} r={0.8} fill="#DDB77A" />
      <Circle cx={29.5} cy={33} r={0.9} fill="#DDB77A" />
    </G>
  ),
  pastry: () => (
    <G>
      <Path d="M16 35c-7.5-2-9.2-13.5-3.2-18.6 6-5 13.8.4 11.2 10.4 -2.6-10 5.2-15.4 11.2-10.4 6 5.1 4.3 16.6-3.2 18.6" fill="none" stroke="#A95A24" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 34.5L29.5 24M31 34.5L18.5 24" stroke="#A95A24" strokeWidth={5} strokeLinecap="round" />
      <Path d="M16 35c-7.5-2-9.2-13.5-3.2-18.6 6-5 13.8.4 11.2 10.4 -2.6-10 5.2-15.4 11.2-10.4 6 5.1 4.3 16.6-3.2 18.6" fill="none" stroke="#C9783A" strokeWidth={1.6} strokeLinecap="round" strokeDasharray="0.1 9" />
      <Rect x={13} y={20} width={1.8} height={1.4} rx={0.4} fill={WHITE} />
      <Rect x={33} y={19} width={1.8} height={1.4} rx={0.4} fill={WHITE} />
      <Rect x={23.2} y={29} width={1.6} height={1.3} rx={0.4} fill={WHITE} />
      <Rect x={10.5} y={27} width={1.5} height={1.2} rx={0.4} fill={WHITE} />
      <Rect x={36} y={28} width={1.5} height={1.2} rx={0.4} fill={WHITE} />
    </G>
  ),
  cereal: () => (
    <G>
      <Line x1={30} y1={22} x2={40} y2={9} stroke="#AEB8C2" strokeWidth={2.6} strokeLinecap="round" />
      <Ellipse cx={24} cy={25} rx={16} ry={4} fill="#FBF3E4" />
      <Ellipse cx={17} cy={23.2} rx={2.6} ry={1.6} fill="#E3A845" />
      <Ellipse cx={23} cy={22} rx={2.4} ry={1.5} fill="#D18F2E" />
      <Ellipse cx={28.5} cy={23.6} rx={2.5} ry={1.5} fill="#E3A845" />
      <Ellipse cx={20.5} cy={25.4} rx={2.2} ry={1.3} fill="#D18F2E" />
      <Circle cx={32} cy={24.6} r={1.8} fill="#4E6FD1" />
      <Circle cx={14} cy={25.4} r={1.6} fill="#4E6FD1" />
      <Bowl color="#5B8DEF" stroke="none" />
      <Path d="M12 30c3 4.5 7 6.5 12 6.5" stroke={WHITE} strokeOpacity={0.35} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </G>
  ),
  rice: () => (
    <G>
      <Line x1={29} y1={19} x2={42} y2={7} stroke="#8A5A3B" strokeWidth={2} strokeLinecap="round" />
      <Line x1={32} y1={20.5} x2={43.5} y2={10.5} stroke="#A26D48" strokeWidth={2} strokeLinecap="round" />
      <Path d="M10.5 25.5c.6-9 26.4-9 27 0z" fill={WHITE} stroke={EDGE} strokeWidth={1} />
      <Ellipse cx={18} cy={21} rx={1.4} ry={0.7} fill="#E6DFCF" />
      <Ellipse cx={24} cy={18.6} rx={1.4} ry={0.7} fill="#E6DFCF" />
      <Ellipse cx={29.5} cy={21.2} rx={1.4} ry={0.7} fill="#E6DFCF" />
      <Ellipse cx={22} cy={22.8} rx={1.3} ry={0.6} fill="#E6DFCF" />
      <Bowl color="#D24B45" stroke="none" />
      <Path d="M10 29h28" stroke="#F2C14E" strokeWidth={1.4} />
    </G>
  ),
  pasta: () => (
    <G>
      <Circle cx={24} cy={25} r={15} fill={WHITE} stroke={EDGE} strokeWidth={1} />
      <G fill="none" stroke="#EDBE3C" strokeWidth={1.8}>
        <Ellipse cx={24} cy={25} rx={10} ry={5.5} />
        <Ellipse cx={24} cy={25} rx={10} ry={5.5} transform="rotate(45 24 25)" />
        <Ellipse cx={24} cy={25} rx={10} ry={5.5} transform="rotate(90 24 25)" />
        <Ellipse cx={24} cy={25} rx={10} ry={5.5} transform="rotate(135 24 25)" />
      </G>
      <G fill="none" stroke="#DDAA22" strokeWidth={1.4}>
        <Ellipse cx={24} cy={25} rx={7} ry={3.5} transform="rotate(20 24 25)" />
        <Ellipse cx={24} cy={25} rx={7} ry={3.5} transform="rotate(110 24 25)" />
      </G>
      <Path d="M18.5 25c0-3.8 2.6-5.8 5.6-5.8 3.6 0 5.8 2.4 5.4 5.6-.4 3.4-3 5-5.8 5-3 0-5.2-1.6-5.2-4.8z" fill="#D8402F" />
      <Circle cx={22.6} cy={24} r={2.2} fill="#8E3A22" />
      <Circle cx={26.4} cy={26.4} r={1.9} fill="#8E3A22" />
      <Circle cx={21.9} cy={23.3} r={0.7} fill="#B8603F" />
      <Path d="M25 21.5c1.5-2 4-2 4.8-.8-1.6 1.6-3.2 1.6-4.8.8z" fill={LEAF} />
    </G>
  ),
  potato: () => (
    <G>
      <Path d="M9.5 27c-.7-8.7 8-14.7 17.5-14 9.6.7 13.6 7.6 11.8 15.4-1.8 7.8-11.3 10.2-18 8.6C14 35.5 9.9 32 9.5 27z" fill="#C4905A" />
      <Path d="M13 25c1-5 6-8.5 12-8.8" fill="none" stroke="#DDB07C" strokeWidth={2.2} strokeLinecap="round" />
      <Ellipse cx={19} cy={29} rx={1.3} ry={0.9} fill="#946236" />
      <Ellipse cx={29} cy={22} rx={1.2} ry={0.8} fill="#946236" />
      <Ellipse cx={31.5} cy={31} rx={1.1} ry={0.8} fill="#946236" />
      <Ellipse cx={24} cy={34} rx={0.9} ry={0.6} fill="#946236" />
    </G>
  ),
  fries: () => (
    <G>
      <Rect x={15} y={11} width={4} height={17} rx={1} fill="#F6C343" transform="rotate(-8 17 19)" />
      <Rect x={20.5} y={7.5} width={4} height={20} rx={1} fill="#F9D15C" />
      <Rect x={25.5} y={9.5} width={4} height={18} rx={1} fill="#F6C343" transform="rotate(6 27 18)" />
      <Rect x={30} y={13} width={4} height={15} rx={1} fill="#F9D15C" transform="rotate(12 32 20)" />
      <Path d="M12.5 22.5c7 3.6 16 3.6 23 0L32 40.5H16z" fill="#E0483E" />
      <Path d="M20 31.5a4 4 0 0 0 8 0" fill="none" stroke="#FFD66B" strokeWidth={1.8} strokeLinecap="round" />
    </G>
  ),
  apple: (bg) => (
    <G>
      <Path d="M24 16.5c-6-5.2-15-2.5-15 7.8 0 9 7 15.8 12 15 2-.3 4-.3 6 0 5 .8 12-6 12-15 0-10.3-9-13-15-7.8z" fill="#E5483F" />
      <Path d="M24 16.5c.2-4 1.2-6.4 3.2-8.3" stroke="#6B4226" strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M25.5 12.5c2.5-4.6 8.2-4.6 9.8-2.8-2.6 3-6.8 3.8-9.8 2.8z" fill={LEAF} />
      <Ellipse cx={15.5} cy={23.5} rx={2.2} ry={4} fill={WHITE} fillOpacity={0.35} transform="rotate(20 15.5 23.5)" />
    </G>
  ),
  banana: () => (
    <G>
      <Path d="M10.5 15c1 14.5 12 23.4 26.3 20.4 2.5-.5 3-3 .9-3.6C27 33 17.2 27.4 14.3 14.6c-.5-2.2-3.9-2-3.8.4z" fill="#F6CD3B" />
      <Path d="M13 17.5c2.5 9.5 10 16 20.5 16.5" fill="none" stroke="#E3AE1C" strokeWidth={1.4} strokeLinecap="round" />
      <Circle cx={12.2} cy={13.4} r={1.6} fill="#6B4A2A" />
      <Circle cx={38.6} cy={33.4} r={1.2} fill="#6B4A2A" />
    </G>
  ),
  berries: () => (
    <G>
      <Path d="M24 40.5c-9.5-4-14.5-14-12.2-20.5 2-5.2 8-5.6 12.2-3.3 4.2-2.3 10.2-1.9 12.2 3.3 2.3 6.5-2.7 16.5-12.2 20.5z" fill="#E23F4B" />
      <G fill="#FFE08A">
        <Ellipse cx={18} cy={22} rx={0.7} ry={1} />
        <Ellipse cx={24} cy={21} rx={0.7} ry={1} />
        <Ellipse cx={30} cy={22} rx={0.7} ry={1} />
        <Ellipse cx={21} cy={27} rx={0.7} ry={1} />
        <Ellipse cx={27} cy={27} rx={0.7} ry={1} />
        <Ellipse cx={17.5} cy={29} rx={0.7} ry={1} />
        <Ellipse cx={31} cy={29} rx={0.7} ry={1} />
        <Ellipse cx={24} cy={32.5} rx={0.7} ry={1} />
        <Ellipse cx={20.5} cy={34.5} rx={0.6} ry={0.9} />
        <Ellipse cx={27.5} cy={34.5} rx={0.6} ry={0.9} />
      </G>
      <Path d="M24 19l-6-5.2 4.3.6L24 9l1.7 5.4 4.3-.6z" fill={LEAF} />
      <Path d="M24 18.5l-8.5-1 3.5-2M24 18.5l8.5-1-3.5-2" fill="none" stroke={LEAF} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </G>
  ),
  citrus: () => (
    <G>
      <Circle cx={24} cy={25} r={14.5} fill="#F28C28" />
      <Circle cx={24} cy={25} r={12} fill="#FFF1D6" />
      <Circle cx={24} cy={25} r={11} fill="#FFB54A" />
      <G stroke="#FFF1D6" strokeWidth={1.4} strokeLinecap="round">
        <Line x1={24} y1={25} x2={24} y2={14.5} />
        <Line x1={24} y1={25} x2={33.1} y2={19.8} />
        <Line x1={24} y1={25} x2={33.1} y2={30.2} />
        <Line x1={24} y1={25} x2={24} y2={35.5} />
        <Line x1={24} y1={25} x2={14.9} y2={30.2} />
        <Line x1={24} y1={25} x2={14.9} y2={19.8} />
      </G>
      <Circle cx={24} cy={25} r={1.8} fill="#FFF1D6" />
    </G>
  ),
  avocado: () => (
    <G>
      <Path d="M24 8c-6 0-8 7-9 12-4 6-4 14 1 18 4 3 12 3 16 0 5-4 5-12 1-18-1-5-3-12-9-12z" fill="#3F6B2A" />
      <Path d="M24 11c-4 0-5.5 5-6.2 10-3.3 5-3.3 11 .2 14.5 3 2.5 9 2.5 12 0 3.5-3.5 3.5-9.5.2-14.5-.7-5-2.2-10-6.2-10z" fill="#D5E68E" />
      <Circle cx={24} cy={29} r={5.6} fill="#8A5A35" />
      <Circle cx={22.4} cy={27.4} r={1.6} fill="#B27E52" />
    </G>
  ),
  greens: () => (
    <G>
      <Path d="M21 40.5l1-12.5h4l1 12.5c-2 1-4 1-6 0z" fill="#9CCB5E" />
      <Path d="M22.5 31l-4-4M25.5 31l4-4" stroke="#9CCB5E" strokeWidth={2.4} strokeLinecap="round" />
      <Circle cx={16.5} cy={23} r={6} fill="#3E9B4F" />
      <Circle cx={31.5} cy={23} r={6} fill="#3E9B4F" />
      <Circle cx={24} cy={17} r={7.5} fill="#44A656" />
      <Circle cx={24} cy={25.5} r={5.5} fill="#3A914A" />
      <G fill="#6CC478">
        <Circle cx={21.5} cy={14.5} r={1.5} />
        <Circle cx={14.5} cy={21} r={1.3} />
        <Circle cx={29.5} cy={20.5} r={1.3} />
        <Circle cx={26} cy={19} r={1} />
      </G>
    </G>
  ),
  salad: () => (
    <G>
      <Circle cx={15.5} cy={21.5} r={5.5} fill={LEAF_LIGHT} />
      <Circle cx={22.5} cy={17.5} r={6.5} fill={LEAF} />
      <Circle cx={31} cy={19.5} r={6} fill="#65B84E" />
      <Circle cx={35} cy={23.5} r={4} fill={LEAF} />
      <Circle cx={27} cy={22} r={3.6} fill="#E8413C" />
      <Circle cx={27} cy={22} r={1.5} fill="#F7867E" />
      <Circle cx={18.5} cy={23} r={2.8} fill="#F2D24A" />
      <Bowl color="#2BA38F" stroke="none" />
      <Path d="M12 30c3 4.5 7 6.5 12 6.5" stroke={WHITE} strokeOpacity={0.3} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </G>
  ),
  carrot: () => (
    <G>
      <Path d="M33 12.5c-1.2-4.4.6-7 3.2-7.3.2 3-.8 5.6-3.2 7.3z" fill={LEAF} />
      <Path d="M34.5 13.5c3.6-2.6 6.8-2.4 7.6-.4-2.6 1.4-5 1.6-7.6.4z" fill={LEAF_LIGHT} />
      <Path d="M35 13.5c-4-3.5-21.5 15.2-23.6 22.2-.5 1.8.5 2.8 2.3 2.3C20.7 36 38.5 18 35 13.5z" fill="#F28A2E" />
      <G stroke="#D8701A" strokeWidth={1.3} strokeLinecap="round">
        <Line x1={26} y1={19.5} x2={29} y2={22} />
        <Line x1={20.5} y1={25.5} x2={23} y2={28} />
        <Line x1={16} y1={31} x2={18} y2={33} />
      </G>
    </G>
  ),
  tomato: () => (
    <G>
      <Circle cx={24} cy={26.5} r={13} fill="#E4433A" />
      <Ellipse cx={18} cy={23} rx={2.4} ry={3.6} fill={WHITE} fillOpacity={0.3} transform="rotate(30 18 23)" />
      <Polygon points="24,13 26,16.5 30.5,15.5 27.8,18.8 29,22 24,20 19,22 20.2,18.8 17.5,15.5 22,16.5" fill={LEAF} />
      <Line x1={24} y1={14} x2={24.8} y2={9.5} stroke="#3F8E3B" strokeWidth={2} strokeLinecap="round" />
    </G>
  ),
  chicken: () => (
    <G>
      <Line x1={22} y1={26} x2={14} y2={34} stroke="#D9C7AE" strokeWidth={5.6} strokeLinecap="round" />
      <Circle cx={11.6} cy={33.6} r={3.6} fill="#D9C7AE" />
      <Circle cx={14.4} cy={36.4} r={3.6} fill="#D9C7AE" />
      <Line x1={22} y1={26} x2={14} y2={34} stroke="#FBF5EC" strokeWidth={4.2} strokeLinecap="round" />
      <Circle cx={11.6} cy={33.6} r={2.9} fill="#FBF5EC" />
      <Circle cx={14.4} cy={36.4} r={2.9} fill="#FBF5EC" />
      <Ellipse cx={29} cy={19} rx={12} ry={9.5} fill="#C9772E" transform="rotate(-45 29 19)" />
      <Ellipse cx={30} cy={17.5} rx={8.5} ry={6} fill="#DE9446" transform="rotate(-45 30 17.5)" />
      <Path d="M26 14c2-2.5 5-3.5 7.5-3" stroke="#F0B06A" strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </G>
  ),
  meat: () => (
    <G>
      <Path d="M11.5 21c0-7.5 10.5-10.8 18.8-8.8C38.5 14.2 40.5 22 36.6 29c-3.2 6-12 9-19 6.4-6-2.3-6.1-8-6.1-14.4z" fill="#A5452C" stroke="#EBC7A6" strokeWidth={2.4} />
      <G stroke="#6E2A18" strokeWidth={1.8} strokeLinecap="round" opacity={0.75}>
        <Line x1={19} y1={17} x2={31} y2={29} />
        <Line x1={15} y1={22} x2={25} y2={32} />
        <Line x1={24} y1={15} x2={35} y2={26} />
      </G>
    </G>
  ),
  sausage: () => (
    <G>
      <Path d="M10.5 30.5c5-12 22-12 27 0" fill="none" stroke="#A9472E" strokeWidth={9} strokeLinecap="round" />
      <Path d="M13.5 26.5c5-7 16-7 21 0" fill="none" stroke="#C9674A" strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M13 29l2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5 2.5 2.5 2.5-2.5" fill="none" stroke="#F6C343" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" transform="translate(0 -6)" />
    </G>
  ),
  fish: () => (
    <G>
      <Path d="M35.5 24.5l7.5-7.3v14.6z" fill="#2F6CB8" />
      <Path d="M7.5 24.5c6-10.5 22-11.5 29 0-7 11.5-23 10.5-29 0z" fill="#3F82D6" />
      <Path d="M10 26c7 5.5 17 5.5 24 .5" fill="none" stroke="#A9CDF4" strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M18 18c-1.8 4-1.8 8 0 12.5" fill="none" stroke="#2F6CB8" strokeWidth={1.4} strokeLinecap="round" />
      <Circle cx={13.5} cy={22.5} r={2.3} fill={WHITE} />
      <Circle cx={13.8} cy={22.6} r={1.1} fill="#1E2A36" />
      <Path d="M24 16.5l4-4 3 5" fill="#2F6CB8" />
    </G>
  ),
  legume: () => (
    <G>
      <Path d="M8.5 31c5.3-12.3 21-16.8 30.8-13.5-2.8 10.5-17.8 17.3-30.8 13.5z" fill="#5FA83E" />
      <Circle cx={17} cy={26.3} r={3.6} fill="#A6DB6F" />
      <Circle cx={24.2} cy={23.6} r={3.6} fill="#A6DB6F" />
      <Circle cx={31.2} cy={21.2} r={3.4} fill="#A6DB6F" />
      <Path d="M8.5 31c9 1.5 21-2.5 30.8-13.5" fill="none" stroke="#3F7F28" strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M39.3 17.5c.8-2 2.4-3.4 4-3.8" stroke="#3F7F28" strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </G>
  ),
  milk: () => (
    <G>
      <Rect x={19} y={5.5} width={10} height={3.4} rx={0.8} fill="#DCE5EF" />
      <Path d="M15 17.5l4-8.6h10l4 8.6z" fill="#E6EDF5" stroke="#C6D2DF" strokeWidth={1} strokeLinejoin="round" />
      <Rect x={15} y={17.5} width={18} height={23} rx={1.4} fill={WHITE} stroke="#C6D2DF" strokeWidth={1} />
      <Rect x={15} y={24} width={18} height={10} fill="#4C8DF6" />
      <Path d="M24 26.3c-1.5 2-2.4 3.4-2.4 4.5a2.4 2.4 0 0 0 4.8 0c0-1.1-.9-2.5-2.4-4.5z" fill={WHITE} />
    </G>
  ),
  yogurt: () => (
    <G>
      <Path d="M12.5 17h23l-3 21.2a2 2 0 0 1-2 1.8h-13a2 2 0 0 1-2-1.8z" fill={WHITE} stroke="#D3D8E6" strokeWidth={1} />
      <Path d="M13.6 25h20.8l-1.1 7.5H14.7z" fill="#B7A5FA" />
      <Circle cx={24} cy={28.7} r={2.6} fill="#E2475A" />
      <Path d="M24 26.3l-1.2-1.2M24 26.3l1.2-1.2" stroke={LEAF} strokeWidth={1.2} strokeLinecap="round" />
      <Ellipse cx={24} cy={17} rx={12.8} ry={3} fill="#8B6CF6" />
      <Path d="M33 16c2.5-3 5.5-4 8-3.5-.8 3-3.5 4.6-6.8 4.8" fill="#A994F8" />
    </G>
  ),
  cheese: () => (
    <G>
      <Path d="M7.5 22.5l27-11 6 11z" fill="#FFD95C" />
      <Path d="M7.5 22.5h33v12.5a2 2 0 0 1-2 2h-29a2 2 0 0 1-2-2z" fill="#F4BD35" />
      <Circle cx={15} cy={29} r={2.6} fill="#DCA021" />
      <Circle cx={27} cy={31.5} r={2} fill="#DCA021" />
      <Circle cx={34} cy={27} r={1.6} fill="#DCA021" />
      <Ellipse cx={26} cy={18.5} rx={2.2} ry={1} fill="#EDB935" />
      <Path d="M7.5 22.5h33" stroke="#FFE68A" strokeWidth={1.2} />
    </G>
  ),
  fat: () => (
    <G>
      <Rect x={19.5} y={6} width={9} height={4.5} rx={1.2} fill="#3F6B2A" />
      <Path d="M20.5 10.5h7v3c0 2 3 3 3 6V38a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V19.5c0-3 3-4 3-6z" fill="#D4DC6A" stroke="#A9B33D" strokeWidth={1} />
      <Path d="M17.6 24h12.8v8H17.6z" fill="#FBF6E6" />
      <Path d="M24 25.6c-1.2 1.7-2 2.8-2 3.7a2 2 0 0 0 4 0c0-.9-.8-2-2-3.7z" fill="#A9B33D" />
      <Path d="M20.5 20v16" stroke={WHITE} strokeOpacity={0.5} strokeWidth={1.4} strokeLinecap="round" />
    </G>
  ),
  sauce: () => (
    <G>
      <Rect x={22.4} y={4.5} width={3.2} height={3.5} rx={1} fill="#EDE7DC" />
      <Path d="M20 15l1.6-7h4.8l1.6 7z" fill="#F4EFE6" stroke={EDGE} strokeWidth={0.8} />
      <Rect x={15.5} y={15} width={17} height={26} rx={6} fill="#D9342B" />
      <Rect x={18.5} y={23} width={11} height={9} rx={2} fill="#FBF6E6" />
      <Path d="M22 27.5c.8-2 3.2-2 4 0-.8 2-3.2 2-4 0z" fill="#D9342B" />
      <Path d="M18.5 18.5v18" stroke={WHITE} strokeOpacity={0.35} strokeWidth={1.4} strokeLinecap="round" />
    </G>
  ),
  coffee: () => (
    <G>
      <Path d="M19 12.5c-1.5-2 1.5-3.5 0-5.5M25 12.5c-1.5-2 1.5-3.5 0-5.5" fill="none" stroke="#B89A80" strokeWidth={1.6} strokeLinecap="round" />
      <Ellipse cx={22.5} cy={37.5} rx={14} ry={2.8} fill="#EFE7DC" stroke={EDGE} strokeWidth={1} />
      <Path d="M32 22.5c6.5-.5 6.5 9-1 8.5" fill="none" stroke={WHITE} strokeWidth={3} />
      <Path d="M32 22.5c6.5-.5 6.5 9-1 8.5" fill="none" stroke={EDGE} strokeWidth={1} />
      <Path d="M12 18.5h21v9c0 5.5-4.5 9.5-10.5 9.5S12 33 12 27.5z" fill={WHITE} stroke={EDGE} strokeWidth={1} />
      <Ellipse cx={22.5} cy={18.6} rx={10.3} ry={2.4} fill="#6F4526" />
      <Ellipse cx={20.5} cy={18.3} rx={3.2} ry={0.9} fill="#C79A6E" />
    </G>
  ),
  juice: () => (
    <G>
      <Line x1={26} y1={18} x2={32} y2={4.5} stroke="#EC6A9C" strokeWidth={2.4} strokeLinecap="round" />
      <Glass fill="#FFA928" level={15} />
      <Path d="M28 10a6 6 0 0 1 12 0z" fill="#F28C28" />
      <Path d="M29.3 10a4.7 4.7 0 0 1 9.4 0z" fill="#FFC867" />
    </G>
  ),
  soda: () => (
    <G>
      <Rect x={14.5} y={9.5} width={19} height={30.5} rx={3.5} fill="#D9342B" />
      <Rect x={14.5} y={8} width={19} height={4} rx={1.8} fill="#C9CFD7" />
      <Rect x={14.5} y={37} width={19} height={3.5} rx={1.6} fill="#C9CFD7" />
      <Path d="M14.5 27c5-4 10 3 19-2v5c-9 5-14-2-19 2z" fill={WHITE} />
      <Path d="M18 14v20" stroke={WHITE} strokeOpacity={0.3} strokeWidth={1.6} strokeLinecap="round" />
      <Rect x={21} y={5.8} width={6} height={2.6} rx={1.2} fill="#AEB6C0" />
    </G>
  ),
  beer: () => (
    <G>
      <Path d="M31 20h3.5a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H31" fill="none" stroke="#F3D38A" strokeWidth={3} />
      <Rect x={12.5} y={15} width={19} height={25} rx={2.5} fill="#F2B233" />
      <Path d="M16 20v16M20.5 20v16M24.5 20v16M28.5 20v16" stroke="#F8CD62" strokeWidth={1.2} strokeLinecap="round" />
      <Circle cx={14.5} cy={15} r={4} fill={WHITE} />
      <Circle cx={19.5} cy={13} r={4.6} fill={WHITE} />
      <Circle cx={25.5} cy={13} r={4.6} fill={WHITE} />
      <Circle cx={30} cy={15.5} r={3.6} fill={WHITE} />
      <Rect x={12.5} y={14.5} width={19} height={4} fill={WHITE} />
    </G>
  ),
  wine: () => (
    <G>
      <Path d="M16.5 9h15c.2 9.5-2.5 16-7.5 16s-7.7-6.5-7.5-16z" fill="#EDF3F8" fillOpacity={0.7} stroke="#B9C3CF" strokeWidth={1.2} />
      <Path d="M16.9 15h14.2c-.6 6.3-3.2 10-7.1 10s-6.5-3.7-7.1-10z" fill="#8E2C48" />
      <Line x1={24} y1={25} x2={24} y2={37} stroke="#B9C3CF" strokeWidth={1.8} />
      <Ellipse cx={24} cy={38} rx={7} ry={2} fill="#D5DDE6" />
      <Path d="M19 11.5v5" stroke={WHITE} strokeOpacity={0.7} strokeWidth={1.4} strokeLinecap="round" />
    </G>
  ),
  water: () => (
    <G>
      <Glass fill="#8FD0F2" level={17} />
      <Rect x={20} y={20} width={6.5} height={6.5} rx={1.4} fill={WHITE} fillOpacity={0.75} transform="rotate(14 23 23)" />
      <Circle cx={26} cy={31} r={1} fill={WHITE} fillOpacity={0.8} />
      <Circle cx={22} cy={34} r={0.8} fill={WHITE} fillOpacity={0.8} />
    </G>
  ),
  nut: () => (
    <G>
      <Path d="M24 13c7 0 12 7.5 12 14.5S30.5 40 24 40 12 34.5 12 27.5 17 13 24 13z" fill="#B7773F" />
      <Path d="M17 30c.5 3.5 3 6 6 6.8" fill="none" stroke="#D39A63" strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12.8 23.5C13 15 35 15 35.2 23.5c-4.2-2.3-18.2-2.3-22.4 0z" fill="#7A4A26" />
      <Path d="M24 16.5v-4.5" stroke="#7A4A26" strokeWidth={2.2} strokeLinecap="round" />
    </G>
  ),
  chocolate: () => (
    <G>
      <Rect x={12.5} y={8.5} width={23} height={31} rx={2.5} fill="#6B3E26" />
      <G fill="#7E4C30" stroke="#8F5C3C" strokeWidth={0.8}>
        <Rect x={14.5} y={10.5} width={8.5} height={7} rx={1.2} />
        <Rect x={25} y={10.5} width={8.5} height={7} rx={1.2} />
        <Rect x={14.5} y={19.5} width={8.5} height={7} rx={1.2} />
        <Rect x={25} y={19.5} width={8.5} height={7} rx={1.2} />
      </G>
      <Path d="M11.5 29.5l3-1.5 3 1.5 3-1.5 3 1.5 3-1.5 3 1.5 3-1.5 3 1.5 1.5-.7V41h-26z" fill="#C9CFD7" />
      <Rect x={11.5} y={32} width={25} height={9} fill="#C0392B" />
      <Path d="M11.5 36h25" stroke="#E0655A" strokeWidth={1} />
    </G>
  ),
  sweets: () => (
    <G>
      <Path d="M15.5 24L7 17.5v13z" fill="#F59BBF" />
      <Path d="M32.5 24L41 17.5v13z" fill="#F59BBF" />
      <Ellipse cx={24} cy={24} rx={9.5} ry={7.5} fill="#E0527E" />
      <Path d="M19 17.8c-2 4-2 8.4 0 12.4M24.5 16.6c-2 4.5-2 10.3 0 14.8M29.5 17.6c-2 4-2 8.6 0 12.8" fill="none" stroke={WHITE} strokeOpacity={0.6} strokeWidth={1.6} strokeLinecap="round" />
    </G>
  ),
  cake: () => (
    <G>
      <Ellipse cx={24} cy={38} rx={16} ry={2.6} fill="#EDE8F0" stroke={EDGE} strokeWidth={0.8} />
      <Path d="M9.5 37V26.5l29-8.5V37z" fill="#F3D19B" />
      <Path d="M9.5 31.5l29-6v3l-29 6z" fill="#FFF3E0" />
      <Path d="M9.5 26.5l29-8.5v3.4c-2.2 1.6-3.6-.5-5.6 1.2-2 1.7-3.6-.5-5.8 1.3-2.2 1.8-3.8-.3-6 1.4-2.2 1.7-3.8-.2-6 1.4-2 1.4-3.6.6-5.6 1.6z" fill="#E86F9E" />
      <Circle cx={33} cy={16} r={3} fill="#C62D3B" />
      <Path d="M33 13c.6-2 2-3 3.5-3.4" stroke="#3F7F28" strokeWidth={1.2} strokeLinecap="round" fill="none" />
    </G>
  ),
  cookie: (bg) => (
    <G>
      <Circle cx={24} cy={25} r={14} fill="#D39A52" />
      <Circle cx={36.5} cy={13} r={6.5} fill={bg} />
      <G fill="#5B3620">
        <Path d="M17 19.5l2.4-.8.8 2.3-2.2 1z" />
        <Path d="M27 20l2.3.2-.3 2.4-2.2-.4z" />
        <Path d="M20 29l2.5.3-.4 2.3-2.3-.5z" />
        <Path d="M29.5 29.5l2 .9-1 2.1-2-1z" />
        <Path d="M14 26.5l1.8.6-.6 2-1.8-.7z" />
        <Path d="M24 24.5l1.6.4-.4 1.8-1.6-.5z" />
      </G>
      <Path d="M13 30c1.5 3.5 4.5 6 8 7" fill="none" stroke="#E6B878" strokeWidth={1.6} strokeLinecap="round" />
    </G>
  ),
  icecream: () => (
    <G>
      <Path d="M16.5 24.5L24 42.5l7.5-18z" fill="#E0A45A" />
      <Path d="M19 27l7.5 7.5M22 25l7 7M18.5 31l4.5-4.5M21 36l7-9" stroke="#C4843A" strokeWidth={1} strokeLinecap="round" />
      <Circle cx={19.5} cy={21} r={6.2} fill="#F7C6D9" />
      <Circle cx={28.5} cy={21} r={6.2} fill="#FFF1D8" />
      <Circle cx={24} cy={14.5} r={6.4} fill="#8B5A3C" />
      <Circle cx={22} cy={12.5} r={1.4} fill="#A9795A" />
      <Circle cx={24} cy={7.8} r={2.2} fill="#C62D3B" />
    </G>
  ),
  chips: () => (
    <G>
      <Ellipse cx={18.5} cy={25} rx={9} ry={6} fill="#F2B632" transform="rotate(-24 18.5 25)" />
      <Ellipse cx={29} cy={21} rx={9} ry={6} fill="#F7CD55" transform="rotate(18 29 21)" />
      <Ellipse cx={25} cy={31} rx={9.5} ry={6} fill="#F9D86E" transform="rotate(-6 25 31)" />
      <G fill="#E0A020">
        <Circle cx={22} cy={30} r={0.9} />
        <Circle cx={28} cy={32} r={0.8} />
        <Circle cx={30} cy={19.5} r={0.8} />
        <Circle cx={15.5} cy={24} r={0.8} />
      </G>
      <Path d="M18 33c4 1.5 9 1.5 13-.5" fill="none" stroke="#E7B43A" strokeWidth={1.2} strokeLinecap="round" />
    </G>
  ),
  protein: () => (
    <G>
      <Rect x={21} y={6.5} width={6} height={5} rx={1.4} fill="#7B5CE6" />
      <Rect x={14} y={11.5} width={20} height={6} rx={2} fill="#9A82F0" />
      <Path d="M15 17.5h18l-2 21a2 2 0 0 1-2 1.5H19a2 2 0 0 1-2-1.5z" fill="#454E63" />
      <Path d="M17.5 23h3M17.8 27h2.2M18.1 31h3" stroke={WHITE} strokeOpacity={0.6} strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M26.5 23.5l-3 5h3l-2 5 5-6.5h-3l2-3.5z" fill="#F6C343" />
    </G>
  ),
  pizza: () => (
    <G>
      <Path d="M24 41L10.5 13.5c8.6-4.3 18.4-4.3 27 0z" fill="#F6C343" />
      <Path d="M10.5 13.5c8.6-4.3 18.4-4.3 27 0l-1.6 3.3c-7.6-3.6-16.2-3.6-23.8 0z" fill="#D9894A" />
      <Circle cx={24} cy={21} r={3.2} fill="#C0392B" />
      <Circle cx={18} cy={18.6} r={2.4} fill="#C0392B" />
      <Circle cx={29.5} cy={18.8} r={2.4} fill="#C0392B" />
      <Circle cx={24} cy={30.5} r={2.4} fill="#C0392B" />
      <Path d="M20 25c1.2-1.6 3-1.8 3.8-1-1.2 1.4-2.6 1.6-3.8 1zM27 26.5c1.2-1.6 3-1.8 3.8-1-1.2 1.4-2.6 1.6-3.8 1z" fill={LEAF} />
    </G>
  ),
  burger: () => (
    <G>
      <Rect x={10} y={31} width={28} height={7} rx={3.5} fill="#E0A04A" />
      <Rect x={10.5} y={25.5} width={27} height={6} rx={3} fill="#6B3A22" />
      <Path d="M11 26.5h26l-4 3.5-3-2-5 3.5-4-3z" fill="#F6C343" />
      <Path d="M9.5 24.5c2 1.6 3.5-.8 5.6.8 2 1.6 3.4-.8 5.5.8 2 1.6 3.5-.8 5.6.8 2 1.6 3.4-.8 5.5.8 2 1.6 3.4-.4 6.8-.8" fill="none" stroke={LEAF} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M10 23c0-10.5 28-10.5 28 0z" fill="#E6A24C" />
      <G fill="#FFF3DC">
        <Ellipse cx={18} cy={17} rx={1} ry={0.6} transform="rotate(-20 18 17)" />
        <Ellipse cx={24} cy={15.5} rx={1} ry={0.6} />
        <Ellipse cx={30} cy={17} rx={1} ry={0.6} transform="rotate(20 30 17)" />
        <Ellipse cx={21} cy={19.8} rx={1} ry={0.6} />
        <Ellipse cx={27.5} cy={19.8} rx={1} ry={0.6} />
      </G>
    </G>
  ),
  soup: () => (
    <G>
      <Path d="M19 14c-1.5-2 1.5-3.5 0-5.5M25 13c-1.5-2 1.5-3.5 0-5.5M31 14c-1.5-2 1.5-3.5 0-5.5" fill="none" stroke="#C9B7A6" strokeWidth={1.6} strokeLinecap="round" />
      <Ellipse cx={24} cy={25} rx={16} ry={4} fill="#E0782F" />
      <Circle cx={19} cy={24.5} r={1.4} fill={LEAF} />
      <Circle cx={27} cy={25.6} r={1.2} fill={LEAF} />
      <Circle cx={23} cy={23.6} r={1.6} fill="#F6C343" />
      <Bowl color={WHITE} />
      <Path d="M8 25h32" stroke={EDGE} strokeWidth={1} />
      <Path d="M13 31.5h22" stroke="#E0782F" strokeWidth={1.4} strokeOpacity={0.6} />
    </G>
  ),
  dish: () => (
    <G>
      <Path d="M7.5 12v8.5M5.5 12v6a2 2 0 0 0 4 0v-6M7.5 20.5V38" stroke="#AEB8C2" strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Path d="M40.5 38V12c-2.6 1.5-3.4 6-2.8 12h2.8" stroke="#AEB8C2" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="#AEB8C2" />
      <Circle cx={24} cy={25} r={13.5} fill={WHITE} stroke={EDGE} strokeWidth={1} />
      <Circle cx={24} cy={25} r={9.5} fill="none" stroke="#ECE8E1" strokeWidth={1} />
      <Path d="M18 26c0-4 3-6.5 6.5-6.5 3 0 5 2 5 4.5 0 3.5-4 5.5-7.5 5.5-2.5 0-4-1.2-4-3.5z" fill="#E08A3A" />
      <Path d="M24 28.5c2.5-2.5 6-2.8 7.5-1.5-2 2.4-5 2.8-7.5 1.5z" fill={LEAF} />
      <Circle cx={20.5} cy={23} r={1.2} fill="#F5C07A" />
    </G>
  ),
};

/** A food illustration on a rounded tile. `bg` is the tile color. */
export function FoodArt({ category, size = 46, bg, radius }: { category: FoodCategory; size?: number; bg: string; radius?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius ?? size * 0.3, backgroundColor: bg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size * 0.86} height={size * 0.86} viewBox="0 0 48 48">
        {ART[category](bg)}
      </Svg>
    </View>
  );
}

export const FOOD_CATEGORIES = Object.keys(ART) as FoodCategory[];

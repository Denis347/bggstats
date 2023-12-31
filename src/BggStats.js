import React, { useEffect, useState } from "react";
import XMLParser from "react-xml-parser";
import axios from "axios";
import axiosRetry from "axios-retry";
import he from "he";
import {
  Grid,
  Column,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  TabsSkeleton,
  DatePicker,
  DatePickerInput,
  SkeletonText,
} from "@carbon/react";
import { CharacterWholeNumber, EventsAlt, GameConsole, Monster, Person } from "@carbon/icons-react";
import moment from "moment";
import ByPlayer from "./ByPlayer";
import ByGame from "./ByGame";
import ByPlayerCount from "./ByPlayerCount";
import ByNumberOfPlays from "./ByNumberOfPlays";

axiosRetry(axios, { retries: 20, retryDelay: 3000 });

const BggStats = () => {
  let params = new URL(document.location).searchParams;
  let user = params.get("user");
  if (!user) {
    user = "Denis347";
  }

  const [bggData, setBggData] = useState({});
  const [ownedGamesPlayed, setOwnedGamesPlayed] = useState(0);
  const [ownedGamesNotPlayed, setOwnedGamesNotPlayed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOwnedGamesPlayed, setIsLoadingOwnedGamesPlayed] =
    useState(true);
  const [isLoadingOwnedGamesNotPlayed, setIsLoadingOwnedGamesNotPlayed] =
    useState(true);
  const [date, setDate] = useState({
    mindate: moment().startOf("year").format("YYYY-MM-DD"),
    maxdate: moment().format("YYYY-MM-DD"),
  });

  const parsePlays = (plays) => {
    const parsedPlays = [];

    for (let i = 0; i < plays.length; i++) {
      const play = plays[i];
      const date = play.attributes.date;
      const location = play.attributes.location;

      const name = play.children.find((c) => c.name === "item").attributes.name;
      const gameId = play.children.find((c) => c.name === "item").attributes
        .objectid;
      const players = play.children
        .find((c) => c.name === "players")
        .children.map((c) =>
          c.attributes.username ? c.attributes.username : c.attributes.name
        );

      parsedPlays.push({
        Game: he.decode(name),
        GameId: gameId,
        Date: date,
        Location: location,
        Players: players,
      });
    }
    return parsedPlays;
  };

  const getData = async () => {
    setIsLoading(true);
    const username = user;
    const response = await axios.get(
      `https://api.geekdo.com/xmlapi2/plays?username=${username}&page=1&mindate=${date.mindate}&maxdate=${date.maxdate}`
    );
    const parsedData = new XMLParser().parseFromString(response.data);

    const total = parsedData.attributes?.total || 0;
    const numberOfPages = Math.ceil(total / 100);

    for (let currentPage = 2; currentPage <= numberOfPages; currentPage++) {
      const response = await axios.get(
        `https://api.geekdo.com/xmlapi2/plays?username=${username}&page=${currentPage}&mindate=${date.mindate}&maxdate=${date.maxdate}`
      );
      const parsedDataNextPage = new XMLParser().parseFromString(response.data);
      parsedData.children = [
        ...parsedData.children,
        ...parsedDataNextPage.children,
      ];
    }

    parsedData.plays = parsePlays(parsedData.children);
    setBggData(parsedData);
    setIsLoading(false);
  };

  // const getOwnedGamesPlayed = async () => {
  //   setIsLoadingOwnedGamesPlayed(true);
  //   const username = user;
  //   const response = await axios.get(
  //     `https://api.geekdo.com/xmlapi2/collection?username=${username}&subtype=boardgame&own=1&played=1&excludesubtype=boardgameexpansion`
  //   );
  //   const parsedData = new XMLParser().parseFromString(response.data);
  //   let result = 0;
  //   if (parsedData) {
  //     result = parsedData.attributes.totalitems;
  //   }
  //   setOwnedGamesPlayed(parseInt(result));
  //   setIsLoadingOwnedGamesPlayed(false);
  // };
  // const getOwnedGamesNotPlayed = async () => {
  //   setIsLoadingOwnedGamesNotPlayed(true);
  //   const username = user;
  //   const response = await axios.get(
  //     `https://api.geekdo.com/xmlapi2/collection?username=${username}&subtype=boardgame&own=1&played=0&excludesubtype=boardgameexpansion`
  //   );
  //   const parsedData = new XMLParser().parseFromString(response.data);
  //   let result = 0;
  //   if (parsedData) {
  //     result = parsedData.attributes.totalitems;
  //   }
  //   setOwnedGamesNotPlayed(parseInt(result));
  //   setIsLoadingOwnedGamesNotPlayed(false);
  // };

  // useEffect(() => {
  //   getOwnedGamesPlayed();
  //   getOwnedGamesNotPlayed();
  // }, []);

  useEffect(() => {
    getData();
  }, [date]);

  const calculateHIndex = (plays) => {
    let hIndex = 0;
    const gamesByPlays = {};
    plays.map((play) => {
      gamesByPlays[play.Game] = gamesByPlays[play.Game]
        ? gamesByPlays[play.Game] + 1
        : 1;
    });
    let gamesByPlaysArray = Object.keys(gamesByPlays).map((key) => ({
      game: key,
      plays: gamesByPlays[key],
    }));
    gamesByPlaysArray = gamesByPlaysArray.sort((a, b) => {
      return b.plays - a.plays;
    });
    for (let i = 0; i < gamesByPlaysArray.length; i++) {
      const game = gamesByPlaysArray[i];
      if (game.plays >= i + 1) {
        hIndex++;
      } else {
        break;
      }
    }
    return hIndex;
  };
  return (
    <Grid condensed>
      <Column lg={16} md={8} sm={4}>
        <DatePicker
          datePickerType="range"
          dateFormat="Y-m-d"
          onChange={(e) => {
            const startDate =
              e.length > 0 ? moment(e[0]).format("YYYY-MM-DD") : "";
            const endDate =
              e.length > 1 ? moment(e[1]).format("YYYY-MM-DD") : "";
            if (startDate && endDate) {
              if (startDate !== date.mindate || endDate !== date.maxdate) {
                setDate({
                  mindate: startDate,
                  maxdate: endDate,
                });
              }
            }
          }}
        >
          <DatePickerInput
            id="date-picker-input-id-start"
            placeholder="yyyy/mm/dd"
            labelText="Start date"
            size="md"
            value={date.mindate}
          />
          <DatePickerInput
            id="date-picker-input-id-finish"
            placeholder="yyyy/mm/dd"
            labelText="End date"
            size="md"
            value={date.maxdate}
          />
        </DatePicker>
        <br />
        {!isLoading ? (
          <Tabs>
            <TabList aria-label="Navigation" contained fullWidth>
              <Tab renderIcon={Monster}>Basic Info</Tab>
              <Tab renderIcon={EventsAlt}>By Player Count</Tab>
              <Tab renderIcon={Person}>By Player</Tab>
              <Tab renderIcon={GameConsole}>By Game</Tab>
              <Tab renderIcon={CharacterWholeNumber}>By Number of plays</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <p>Name: {bggData.attributes?.username}</p>
                <p>Total plays: {bggData.attributes?.total}</p>
                <p>
                  Unique games played:{" "}
                  {
                    bggData.plays?.reduce(
                      (prev, curr) =>
                        prev.includes(curr.Game) ? prev : [...prev, curr.Game],
                      []
                    ).length
                  }
                </p>
                <p>H-index: {calculateHIndex(bggData.plays || [])}</p>
                {/* {isLoadingOwnedGamesPlayed && ownedGamesPlayed && ownedGamesNotPlayed ? (
                  <SkeletonText />
                ) : (
                  <p>
                    Owned games played: {ownedGamesPlayed} (
                    {Math.ceil((ownedGamesPlayed * 100) /
                      (ownedGamesPlayed + ownedGamesNotPlayed))}
                    %)
                  </p>
                )}
                {isLoadingOwnedGamesNotPlayed && ownedGamesPlayed && ownedGamesNotPlayed ? (
                  <SkeletonText />
                ) : (
                  <p>
                    Owned games not played: {ownedGamesNotPlayed} (
                    {Math.floor((ownedGamesNotPlayed * 100) /
                      (ownedGamesPlayed + ownedGamesNotPlayed))}
                    %)
                  </p>
                )} */}
              </TabPanel>
              <TabPanel>
                <ByPlayerCount user={user} plays={bggData.plays || []} />
              </TabPanel>
              <TabPanel>
                <ByPlayer plays={bggData.plays || []} />
              </TabPanel>
              <TabPanel>
                <ByGame plays={bggData.plays || []} />
              </TabPanel>
              <TabPanel>
                <ByNumberOfPlays plays={bggData.plays || []} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        ) : (
          <Grid condensed>
            <Column lg={16} md={8} sm={4}>
              <TabsSkeleton />
            </Column>
          </Grid>
        )}
      </Column>
    </Grid>
  );
};

export default BggStats;
